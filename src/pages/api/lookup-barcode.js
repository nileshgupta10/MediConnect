export default async function handler(req, res) {
  const { barcode } = req.query;
  if (!barcode) return res.status(400).json({ error: 'No barcode' });

  // 1. Open Food Facts — best free FMCG database
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const d = await r.json();
    if (d.status === 1 && d.product) {
      const p = d.product;
      const name = p.product_name_en || p.product_name || p.generic_name_en || p.generic_name || '';
      if (name) return res.json({ found: true, product_name: name, company: p.brands || '', pack: p.quantity || '', source: 'OpenFoodFacts' });
    }
  } catch {}

  // 2. Open Food Facts India specifically
  try {
    const r = await fetch(`https://in.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const d = await r.json();
    if (d.status === 1 && d.product) {
      const p = d.product;
      const name = p.product_name_en || p.product_name || '';
      if (name) return res.json({ found: true, product_name: name, company: p.brands || '', pack: p.quantity || '', source: 'OpenFoodFacts India' });
    }
  } catch {}

  // 3. Open Beauty Facts — OTC pharma, cosmetics
  try {
    const r = await fetch(`https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`);
    const d = await r.json();
    if (d.status === 1 && d.product?.product_name) {
      const p = d.product;
      return res.json({ found: true, product_name: p.product_name || '', company: p.brands || '', pack: p.quantity || '', source: 'OpenBeautyFacts' });
    }
  } catch {}

  // 4. Open Products Facts — general products
  try {
    const r = await fetch(`https://world.openproductsfacts.org/api/v0/product/${barcode}.json`);
    const d = await r.json();
    if (d.status === 1 && d.product?.product_name) {
      const p = d.product;
      return res.json({ found: true, product_name: p.product_name || '', company: p.brands || '', pack: p.quantity || '', source: 'OpenProductsFacts' });
    }
  } catch {}

  // 5. UPC Item DB
  try {
    const r = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    const d = await r.json();
    if (d.code === 'OK' && d.items?.length > 0) {
      const p = d.items[0];
      return res.json({ found: true, product_name: p.title || '', company: p.brand || '', pack: p.size || '', source: 'UPCitemdb' });
    }
  } catch {}

  // Nothing found
  return res.json({ found: false });
}