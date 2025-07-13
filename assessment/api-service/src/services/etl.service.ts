import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';

export interface ETLJob {
  id: string;
  filename: string;
  studyId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export class ETLService {
  private dbService: DatabaseService;
  private etlServiceUrl: string;

  constructor() {
    this.dbService = new DatabaseService();
    this.etlServiceUrl = process.env.ETL_SERVICE_URL || 'http://etl:8000';
  }

  /**
   * Submit new ETL job
   */
  async submitJob(filename: string, studyId?: string): Promise<ETLJob> {
    const jobId = uuidv4();

    const job: ETLJob = {
      id: jobId,
      filename,
      studyId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.dbService.createETLJob(job);

    try {
      await axios.post(`${this.etlServiceUrl}/jobs`, { jobId, filename, studyId });
      await this.dbService.updateETLJobStatus(jobId, 'running');
      job.status = 'running';
    } catch (error) {
      await this.dbService.updateETLJobStatus(jobId, 'failed', 'Failed to submit to ETL service');
      job.status = 'failed';
      job.errorMessage = 'Failed to submit to ETL service';
    }

    return job;
  }

  /**
   * Get ETL job by ID
   */
  async getJob(jobId: string): Promise<ETLJob | null> {
    return await this.dbService.getETLJob(jobId);
  }

  /**
   * Get ETL job status
   */
  async getJobStatus(jobId: string): Promise<{ status: string; progress?: number; message?: string }> {
    try {
      const job = await this.dbService.getETLJob(jobId);
      if (!job) throw new Error("Job not found in database");

      const response = await axios.get(`${this.etlServiceUrl}/jobs/${jobId}/status`);
      return response.data;
    } catch (error: any) {
      throw new Error("Failed to get ETL job status: " + error.message);
    }
  }

  /**
   * Get all ETL jobs (optional status filter)
   */
  async getAllJobs(status?: string): Promise<ETLJob[]> {
    return this.dbService.getAllETLJobs(status);
  }
}
