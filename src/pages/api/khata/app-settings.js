import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  const DEFAULT_SETTINGS = {
    storeOwnerId,
    companyName: 'MediCLan',
    gstin: '',
    address: '',
    state: 'Maharashtra',
  };

  if (req.method === 'GET') {
    try {
      let settings = await prisma.appSettings.findFirst({
        where: { storeOwnerId }
      });

      if (!settings) {
        settings = await prisma.appSettings.create({
          data: DEFAULT_SETTINGS,
        });
      }

      return res.status(200).json(settings);
    } catch (error) {
      console.error('GET /api/khata/app-settings error:', error);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { companyName, gstin, address, state } = req.body;

      const settings = await prisma.appSettings.upsert({
        where: { storeOwnerId },
        update: {
          ...(companyName !== undefined && { companyName }),
          ...(gstin !== undefined && { gstin }),
          ...(address !== undefined && { address }),
          ...(state !== undefined && { state }),
        },
        create: {
          ...DEFAULT_SETTINGS,
          ...(companyName !== undefined && { companyName }),
          ...(gstin !== undefined && { gstin }),
          ...(address !== undefined && { address }),
          ...(state !== undefined && { state }),
        },
      });

      return res.status(200).json(settings);
    } catch (error) {
      console.error('PUT /api/khata/app-settings error:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
