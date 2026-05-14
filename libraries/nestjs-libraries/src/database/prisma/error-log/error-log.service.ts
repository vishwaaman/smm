import { Injectable } from '@nestjs/common';
import { ErrorLogRepository } from '@gitroom/nestjs-libraries/database/prisma/error-log/error-log.repository';

@Injectable()
export class ErrorLogService {
  constructor(private _repo: ErrorLogRepository) {}

  createLog(data: {
    source: string;
    message: string;
    stack?: string;
    endpoint?: string;
    method?: string;
    requestBody?: string;
    statusCode?: number;
    userId?: string;
    organizationId?: string;
  }) {
    return this._repo.createLog(data);
  }

  getLogs(
    page: number,
    filters: {
      source?: string;
      organizationId?: string;
      from?: string;
      to?: string;
    }
  ) {
    return this._repo.getLogs(page, filters);
  }

  getLogById(id: string) {
    return this._repo.getLogById(id);
  }
}
