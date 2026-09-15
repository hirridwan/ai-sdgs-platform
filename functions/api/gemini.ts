export async function onRequestPost(context: any) {
  try {
    const apiKey = context.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key tidak ditemukan di environment." }), { status: 500 });
    }

    const requestData = await context.request.json();
    const { action, payload } = requestData;

    let prompt = "";
    
    if (action === 'explore') {
      prompt = `Berperanlah sebagai 'AI Explorer'. Berikan penjelasan singkat, data pendukung, dan satu pertanyaan pemantik kritis mengenai isu SDGs berikut: "${payload.title}" (${payload.sdg}). Jawab maksimal 3 paragraf.`;
    } 
    else if (action === 'factCheck') {
      prompt = `Berperanlah sebagai pemeriksa fakta. Analisis kalimat dari teks berikut. Kembalikan HANYA array JSON (tanpa markdown), di mana setiap objek memiliki: 'claim' (kalimat aslinya) dan 'status' (pilih salah satu: "verified", "check", atau "weak"). Teks: "${payload.text}"`;
    }
    else if (action === 'reviewArgument') {
      prompt = `Review argumen debat ini berdasarkan strukturnya. Klaim: "${payload.claim}", Alasan: "${payload.reason}", Bukti: "${payload.evidence}". Berikan masukan atau kritik konstruktif apa yang masih kurang dari argumen tersebut dalam 2 paragraf singkat.`;
    }
    else if (action === 'debate') {
      prompt = `Berperanlah sebagai lawan debat yang kritis namun suportif. Pengguna menyatakan: "${payload.msg}". Bantah atau pertanyakan klaim tersebut untuk memancing pemikiran yang lebih kritis. Jawab langsung tanpa sapaan pembuka.`;
    }
    else if (action === 'evaluateSolution') {
      prompt = `Evaluasi solusi SDGs ini: "${payload.solution}". Berikan 1 pujian tentang mengapa solusi ini baik, dan 1 kritik tentang tantangan pelaksanaannya di dunia nyata.`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const geminiData = await response.json();
    let reply = geminiData.candidates[0].content.parts[0].text;

    if (action === 'factCheck') {
      try {
        const cleanJSON = reply.replace(/```json/g, '').replace(/```/g, '').trim();
        reply = JSON.parse(cleanJSON);
      } catch (err) {
        reply = []; 
      }
    }

    return new Response(JSON.stringify({ result: reply }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}