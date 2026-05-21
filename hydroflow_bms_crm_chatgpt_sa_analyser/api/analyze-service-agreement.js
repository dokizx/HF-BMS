// Vercel serverless function for the BMS Service Agreement ChatGPT analyser.
// Set OPENAI_API_KEY in Vercel project settings. Never put the API key in browser code.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      res.status(501).json({ error: 'OPENAI_API_KEY is not configured on the server.' });
      return;
    }

    const { text, instructions } = req.body || {};
    if (!text || !String(text).trim()) {
      res.status(400).json({ error: 'No agreement text supplied.' });
      return;
    }

    const system = `You are a Hydro Flow BMS Service Agreement analyser. Extract structured contract data from water treatment service agreements. Return JSON only. Rules: chemical products without an individual sell price must still be extracted with price 0. If all chemical prices are 0 or included in a fixed service price, set isNonBillableSite true. Extract service types from schedules such as Cooling Water, Closed Loop, Cooling Tower Cleaning, NATA sampling, Equipment Management, KPI management review, service frequency, monthly charge, annual fixed price, start date, and renewal/expiry date. Use ISO date format YYYY-MM-DD where possible.`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [
          { role: 'system', content: system },
          { role: 'user', content: `${instructions || ''}\n\nSERVICE AGREEMENT TEXT:\n${String(text).slice(0, 180000)}` }
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'service_agreement_analysis',
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                agreementNo: { type: 'string' },
                customer: { type: 'string' },
                site: { type: 'string' },
                attention: { type: 'string' },
                startDate: { type: 'string' },
                renewalDate: { type: 'string' },
                monthlyCharge: { type: 'string' },
                annualFixedPrice: { type: 'string' },
                isNonBillableSite: { type: 'boolean' },
                chemicals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      product: { type: 'string' },
                      price: { type: 'string' },
                      notes: { type: 'string' }
                    },
                    required: ['product', 'price', 'notes']
                  }
                },
                serviceTypes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      type: { type: 'string' },
                      frequency: { type: 'string' },
                      notes: { type: 'string' }
                    },
                    required: ['type', 'frequency', 'notes']
                  }
                },
                notes: { type: 'string' }
              },
              required: ['agreementNo','customer','site','attention','startDate','renewalDate','monthlyCharge','annualFixedPrice','isNonBillableSite','chemicals','serviceTypes','notes']
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({ error: errText });
      return;
    }

    const data = await response.json();
    let output = data.output_text;
    if (!output && Array.isArray(data.output)) {
      output = data.output.flatMap(o => o.content || []).map(c => c.text || '').join('');
    }
    const result = JSON.parse(output || '{}');
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message || String(error) });
  }
}
