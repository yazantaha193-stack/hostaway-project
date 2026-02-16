const axios = require('axios');
const logger = require('../utils/logger');
const { query } = require('../database/init');
const { getRedisClient } = require('../config/redis');

class HostawayService {
  constructor(apiKey, accountId) {
    this.apiKey = apiKey;
    this.accountId = accountId;
    this.baseURL = process.env.HOSTAWAY_API_URL || 'https://api.hostaway.com/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  // Get all listings for this account
  async getListings() {
    try {
      const cacheKey = `hostaway:${this.accountId}:listings`;
      const redis = await getRedisClient();
      
      // Check cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await this.client.get('/listings');
      const listings = response.data.result || [];

      // Cache for 1 hour
      await redis.setex(cacheKey, 3600, JSON.stringify(listings));

      return listings;
    } catch (error) {
      logger.error('Error fetching Hostaway listings:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get reservations
  async getReservations(params = {}) {
    try {
      const response = await this.client.get('/reservations', { params });
      return response.data.result || [];
    } catch (error) {
      logger.error('Error fetching Hostaway reservations:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get specific reservation
  async getReservation(reservationId) {
    try {
      const response = await this.client.get(`/reservations/${reservationId}`);
      return response.data.result;
    } catch (error) {
      logger.error('Error fetching Hostaway reservation:', error.response?.data || error.message);
      throw error;
    }
  }

  // Sync listings to database
  async syncListings() {
    try {
      const listings = await this.getListings();
      const accountResult = await query(
        'SELECT id FROM accounts WHERE hostaway_account_id = $1',
        [this.accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const dbAccountId = accountResult.rows[0].id;

      for (const listing of listings) {
        await query(
          `INSERT INTO properties (account_id, hostaway_listing_id, name, address, city, country, property_type, bedrooms, bathrooms)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (account_id, hostaway_listing_id) 
           DO UPDATE SET name = $3, address = $4, city = $5, country = $6, updated_at = NOW()`,
          [
            dbAccountId,
            listing.id.toString(),
            listing.name,
            listing.address || '',
            listing.city || '',
            listing.country || '',
            listing.propertyTypeName || 'apartment',
            listing.bedrooms || 0,
            listing.bathrooms || 0
          ]
        );
      }

      logger.info(`Synced ${listings.length} listings for account ${this.accountId}`);
      return listings.length;
    } catch (error) {
      logger.error('Error syncing listings:', error);
      throw error;
    }
  }

  // Sync reservations to database
  async syncReservations(startDate, endDate) {
    try {
      const reservations = await this.getReservations({
        arrivalStartDate: startDate,
        arrivalEndDate: endDate
      });

      const accountResult = await query(
        'SELECT id FROM accounts WHERE hostaway_account_id = $1',
        [this.accountId]
      );

      if (accountResult.rows.length === 0) {
        throw new Error('Account not found');
      }

      const dbAccountId = accountResult.rows[0].id;
      let synced = 0;

      for (const reservation of reservations) {
        // Get property ID from database
        const propertyResult = await query(
          'SELECT id FROM properties WHERE account_id = $1 AND hostaway_listing_id = $2',
          [dbAccountId, reservation.listingMapId?.toString()]
        );

        if (propertyResult.rows.length === 0) {
          logger.warn(`Property not found for listing ${reservation.listingMapId}`);
          continue;
        }

        const propertyId = propertyResult.rows[0].id;

        // Insert or update booking
        await query(
          `INSERT INTO bookings (
            account_id, property_id, hostaway_booking_id, guest_name, guest_email, guest_phone,
            check_in, check_out, number_of_guests, booking_status, total_price, currency
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (account_id, hostaway_booking_id)
          DO UPDATE SET 
            booking_status = $10,
            updated_at = NOW()`,
          [
            dbAccountId,
            propertyId,
            reservation.id.toString(),
            reservation.guestName || 'Guest',
            reservation.guestEmail || null,
            reservation.guestPhone || null,
            new Date(reservation.arrivalDate),
            new Date(reservation.departureDate),
            reservation.numberOfGuests || 1,
            reservation.status,
            reservation.totalPrice || 0,
            reservation.currency || 'USD'
          ]
        );

        synced++;
      }

      logger.info(`Synced ${synced} reservations for account ${this.accountId}`);
      return synced;
    } catch (error) {
      logger.error('Error syncing reservations:', error);
      throw error;
    }
  }

  // Create automatic cleaning tasks from new bookings
  async createCleaningTasksFromBooking(bookingId) {
    try {
      const bookingResult = await query(
        `SELECT b.*, p.estimated_cleaning_time, p.name as property_name
         FROM bookings b
         JOIN properties p ON b.property_id = p.id
         WHERE b.id = $1`,
        [bookingId]
      );

      if (bookingResult.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingResult.rows[0];

      // Calculate cleaning time (between checkout and checkin)
      const checkoutTime = new Date(booking.check_out);
      const checkinTime = new Date(booking.check_in);
      const cleaningTime = new Date(checkoutTime);
      cleaningTime.setHours(cleaningTime.getHours() + 1); // 1 hour after checkout

      // Check if task already exists
      const existingTask = await query(
        'SELECT id FROM cleaning_tasks WHERE booking_id = $1',
        [bookingId]
      );

      if (existingTask.rows.length > 0) {
        logger.info(`Cleaning task already exists for booking ${bookingId}`);
        return existingTask.rows[0].id;
      }

      // Create cleaning task
      const taskResult = await query(
        `INSERT INTO cleaning_tasks (
          booking_id, property_id, scheduled_time, estimated_duration, status, priority
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id`,
        [
          bookingId,
          booking.property_id,
          cleaningTime,
          booking.estimated_cleaning_time || 120,
          'pending',
          'normal'
        ]
      );

      const taskId = taskResult.rows[0].id;

      // Create default checklist
      const checklistItems = [
        'تنظيف جميع غرف النوم',
        'تنظيف الحمامات',
        'تنظيف المطبخ',
        'تنظيف غرفة المعيشة',
        'غسل الأرضيات',
        'تنظيف النوافذ',
        'تغيير المناشف والملاءات',
        'إخراج القمامة',
        'فحص الأجهزة'
      ];

      for (let i = 0; i < checklistItems.length; i++) {
        await query(
          'INSERT INTO task_checklist_items (task_id, item, order_index) VALUES ($1, $2, $3)',
          [taskId, checklistItems[i], i]
        );
      }

      logger.info(`Created cleaning task ${taskId} for booking ${bookingId}`);
      return taskId;
    } catch (error) {
      logger.error('Error creating cleaning task:', error);
      throw error;
    }
  }
}

// Get all configured Hostaway accounts
function getAllHostawayAccounts() {
  const accounts = [];
  let i = 1;

  while (process.env[`HOSTAWAY_ACCOUNT_${i}_ID`]) {
    accounts.push({
      id: process.env[`HOSTAWAY_ACCOUNT_${i}_ID`],
      name: process.env[`HOSTAWAY_ACCOUNT_${i}_NAME`],
      apiKey: process.env[`HOSTAWAY_ACCOUNT_${i}_API_KEY`],
      apiSecret: process.env[`HOSTAWAY_ACCOUNT_${i}_API_SECRET`]
    });
    i++;
  }

  return accounts;
}

// Sync all accounts
async function syncAllAccounts() {
  const accounts = getAllHostawayAccounts();
  const results = [];

  for (const account of accounts) {
    try {
      const service = new HostawayService(account.apiKey, account.id);
      
      // Sync listings
      const listingsCount = await service.syncListings();
      
      // Sync reservations for next 90 days
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 90);
      
      const reservationsCount = await service.syncReservations(
        today.toISOString().split('T')[0],
        futureDate.toISOString().split('T')[0]
      );

      results.push({
        accountId: account.id,
        name: account.name,
        listingsCount,
        reservationsCount,
        status: 'success'
      });
    } catch (error) {
      logger.error(`Error syncing account ${account.id}:`, error);
      results.push({
        accountId: account.id,
        name: account.name,
        status: 'error',
        error: error.message
      });
    }
  }

  return results;
}

module.exports = {
  HostawayService,
  getAllHostawayAccounts,
  syncAllAccounts
};
