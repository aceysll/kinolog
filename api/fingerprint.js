export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { genres, directors, countries } = req.body || {}
  if (!Array.isArray(genres) || !Array.isArray(directors) || !Array.isArray(countries)) {
    return res.status(400).json({ error: 'Missing or malformed taste data' })
  }

  const prompt = `
    Based on the following aggregated taste data from a user's watched movies and shows:
    Top genres: ${genres.map(([g, c]) => `${g} (${c})`).join(', ') || 'none yet'}
    Top directors: ${directors.map(([d, c]) => `${d} (${c})`).join(', ') || 'none yet'}
    Top countries: ${countries.map(([c, count]) => `${c} (${count})`).join(', ') || 'none yet'}

    Write a short, insightful blurb, 2 to 3 sentences, that characterizes this person's taste in film and television.
    Return your answer wrapped in fingerprint tags, like this: <fingerprint>your text here</fingerprint>
  `

  const groqPayload = {
    model: 'openai/gpt-oss-120b',
    messages: [{ role: 'user', content: prompt }],
    reasoning_effort: 'low',
    max_tokens: 800,
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(groqPayload),
    })
    if (!groqRes.ok) throw new Error('Groq request failed')
    const data = await groqRes.json()
    const content = data.choices[0].message.content

    let responseText = content
    if (!responseText.includes('<fingerprint>')) {
      responseText = `<fingerprint>${responseText}</fingerprint>`
    }

    res.setHeader('Content-Type', 'text/plain')
    return res.status(200).send(responseText)
  } catch (err) {
    console.error(err)
    res.setHeader('Content-Type', 'text/plain')
    return res.status(500).send('<fingerprint>Unable to generate a taste profile right now.</fingerprint>')
  }
}
