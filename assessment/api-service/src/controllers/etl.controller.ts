import { Request, Response, NextFunction } from 'express';
import { ETLService } from '../services/etl.service';
import { successResponse, errorResponse } from '../utils/response';

export class ETLController {
  private etlService: ETLService;

  constructor() {
    this.etlService = new ETLService();
  }

  /**
   * Submit new ETL job
   * POST /api/etl/jobs
   */
  submitJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { filename, studyId } = req.body;

      if (!filename) {
        errorResponse(res, 'filename is required', 400);
        return;
      }

      const job = await this.etlService.submitJob(filename, studyId);
      successResponse(res, job, 'ETL job submitted successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get ETL job details
   * GET /api/etl/jobs/:id
   */
  getJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const job = await this.etlService.getJob(id);

      if (!job) {
        errorResponse(res, 'Job not found', 404);
        return;
      }

      successResponse(res, job, 'Job retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get ETL job status
   * GET /api/etl/jobs/:id/status
   */
  getJobStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const status = await this.etlService.getJobStatus(id);
      successResponse(res, status, 'Job status retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all ETL jobs
   * GET /api/etl/jobs?status=completed
   */
  getAllJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = req.query.status as string;
      const jobs = await this.etlService.getAllJobs(status);
      successResponse(res, jobs, 'ETL jobs fetched successfully');
    } catch (error) {
      next(error);
    }
  };
}
