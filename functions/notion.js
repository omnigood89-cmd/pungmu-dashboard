export async function onRequest(context) {
  const { request, env } = context;

  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const req = await request.json();

    // dbId 직접 전달 또는 endpoint에서 추출
    const dbId = req.dbId || (req.endpoint && req.endpoint.match(/databases\/([a-f0-9-]+)/)?.[1]);
    const filter = req.filter || req.body?.filter;
    const sorts = req.sorts || req.body?.sorts;
    const pageSize = req.pageSize || req.body?.page_size || 100;
    const startCursor = req.startCursor || req.body?.start_cursor;

    if (!dbId) {
      return new Response(JSON.stringify({ error: 'dbId required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = env.NOTION_TOKEN;
    if (!token) {
      return new Response(JSON.stringify({ error: 'NOTION_TOKEN not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notionBody = { page_size: pageSize };
    if (filter) notionBody.filter = filter;
    if (sorts) notionBody.sorts = sorts;
    if (startCursor) notionBody.start_cursor = startCursor;

    const notionRes = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notionBody),
    });

    const data = await notionRes.json();
    return new Response(JSON.stringify(data), {
      status: notionRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
