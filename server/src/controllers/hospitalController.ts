import { Request, Response } from 'express';
import { db } from '../db/connection.js';

export const hospitalController = {
  async getHospitals(req: Request, res: Response): Promise<void> {
    try {
      const { district } = req.query;
      let sql = 'SELECT * FROM hospitals';
      const params: any[] = [];

      if (district) {
        params.push(district);
        sql += ' WHERE district = $1';
      }

      sql += ' ORDER BY name ASC';
      const hospitals = await db.query(sql, params);

      res.json({
        success: true,
        hospitals,
        count: hospitals.length,
      });
    } catch (err: any) {
      console.error('Error fetching hospitals:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
};
