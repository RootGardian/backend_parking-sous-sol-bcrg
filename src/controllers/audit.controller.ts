import type { Request, Response } from 'express';
import { db } from '../prisma/db';

/**
 * Récupérer le journal d'audit
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  const totalLogs = await db.orm.public.AuditLog.count();

  const logs = await db.orm.public.AuditLog
    .include('utilisateur', (u) => u)
    .orderBy((a) => a.date_action.desc())
    .limit(limit)
    .offset(skip)
    .all();

  res.json({
    logs,
    pagination: {
      total: Number(totalLogs),
      page,
      limit,
      totalPages: Math.ceil(Number(totalLogs) / limit)
    }
  });
};
