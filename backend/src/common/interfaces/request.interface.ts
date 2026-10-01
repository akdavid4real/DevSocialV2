import { Request } from 'express';
import { User } from '../../generated/prisma';

export interface AuthenticatedRequest extends Request {
  user: User;
}
