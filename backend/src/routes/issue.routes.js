import { Router } from 'express';
import * as issueController from '../controllers/issue.controller.js';
import * as uploadController from '../controllers/upload.controller.js';
import {
  protect,
  isStaff,
  isAdminOrSupervisor,
} from '../middlewares/auth.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import {
  createInternalIssueValidator,
  assignIssueValidator,
  transitionIssueValidator,
  updateIssueValidator,
  issueIdValidator,
  listIssuesValidator,
} from '../validators/issue.validator.js';
import {
  uploadEvidence,
  handleMulterError,
} from '../middlewares/upload.middleware.js';

const router = Router();

router.use(protect);

// Stats
router.get('/stats/summary', isStaff, issueController.getIssueStats);

// List
router.get(
  '/',
  isStaff,
  listIssuesValidator,
  validate,
  issueController.getIssues
);

// Create internal
router.post(
  '/',
  isStaff,
  createInternalIssueValidator,
  validate,
  issueController.createInternalIssue
);

// Single
router.get(
  '/:id',
  isStaff,
  issueIdValidator,
  validate,
  issueController.getIssueById
);

// Update details
router.patch(
  '/:id',
  isStaff,
  updateIssueValidator,
  validate,
  issueController.updateIssue
);

// Assign
router.post(
  '/:id/assign',
  isAdminOrSupervisor,
  assignIssueValidator,
  validate,
  issueController.assignIssue
);

// Status transition
router.patch(
  '/:id/status',
  isStaff,
  transitionIssueValidator,
  validate,
  issueController.transitionStatus
);

// Evidence upload (multipart)
router.post(
  '/:id/evidence',
  isStaff,
  issueIdValidator,
  validate,
  uploadEvidence.array('files', 5),
  handleMulterError,
  uploadController.uploadEvidence
);

// Delete single evidence
router.delete(
  '/:id/evidence/:evidenceId',
  isStaff,
  issueIdValidator,
  validate,
  uploadController.deleteEvidence
);

export default router;
