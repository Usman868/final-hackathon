import cron from 'node-cron';
import logger from '../utils/logger.js';
import { processDueMaintenance } from '../services/maintenance.service.js';
import Issue from '../models/Issue.model.js';
import { ISSUE_STATUS } from '../constants/index.js';

/**
 * Daily 8:00 – mark overdue + remind assignees
 */
export const startMaintenanceCron = () => {
  cron.schedule('0 8 * * *', async () => {
    try {
      const result = await processDueMaintenance();
      // Flag open issues past dueAt
      const sla = await Issue.updateMany(
        {
          dueAt: { $lt: new Date() },
          slaBreached: false,
          status: {
            $nin: [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.CLOSED],
          },
        },
        { $set: { slaBreached: true } }
      );
      logger.info('Maintenance cron ran', { ...result, slaFlagged: sla.modifiedCount });
    } catch (err) {
      logger.error('Maintenance cron failed', { error: err.message });
    }
  });
  logger.info('Maintenance cron scheduled (daily 08:00)');
};
