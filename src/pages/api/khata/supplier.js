import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';

const DEFAULT_SUPPLIERS = ["Global Distributors", "Metro Stationery", "Super Trading Co."];

export default async function handler(req, res) {
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  if (req.method === 'GET') {
    try {
      let suppliers = await prisma.khataSupplier.findMany({
        where: { storeOwnerId },
        orderBy: { name: 'asc' },
      });

      // Auto-seed default suppliers for this storeOwnerId if empty
      if (suppliers.length === 0) {
        await prisma.khataSupplier.createMany({
          data: DEFAULT_SUPPLIERS.map(name => ({ storeOwnerId, name })),
        });
        suppliers = await prisma.khataSupplier.findMany({
          where: { storeOwnerId },
          orderBy: { name: 'asc' },
        });
      }

      return res.status(200).json(suppliers);
    } catch (error) {
      console.error("GET supplier error:", error);
      return res.status(500).json([]);
    }
  }

  if (req.method === 'POST') {
    let name = '';
    try {
      const body = req.body;
      name = typeof body.name === 'string' ? body.name : '';
      const { area, phone, dealsIn, gstNumber } = body;

      if (!name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const trimmedName = name.trim();
      const areaStr = (area && typeof area === 'string' && area.trim()) ? area.trim() : 'General';

      // Fetch all suppliers for this user and search case-insensitively in-memory
      const allSuppliers = await prisma.khataSupplier.findMany({
        where: { storeOwnerId }
      });
      
      const existing = allSuppliers.find(
        (sup) => sup.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );

      if (existing) {
        return res.status(200).json(existing);
      }

      const supplier = await prisma.khataSupplier.create({
        data: {
          storeOwnerId,
          name: trimmedName,
          area: areaStr,
          phone: phone?.trim() || null,
          dealsIn: dealsIn?.trim() || null,
          gstNumber: gstNumber?.trim() || null,
        },
      });

      return res.status(201).json(supplier);
    } catch (error) {
      console.error("POST supplier error:", error);
      if (error.code === 'P2002') {
        try {
          const fallback = await prisma.khataSupplier.findFirst({
            where: { name: name.trim(), storeOwnerId }
          });
          if (fallback) {
            return res.status(200).json(fallback);
          }
        } catch {}
        return res.status(400).json({ error: 'Supplier already exists' });
      }
      return res.status(500).json({ error: 'Failed to create supplier' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
