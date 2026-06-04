import { Hono } from "hono";
import type { Env } from "../../shared/types";

const router = new Hono<{ Bindings: Env }>();

router.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    const productName = formData.get('productName') as string;
    const brand = formData.get('brand') as string | null;
    const condition = formData.get('condition') as string | null;
    const productStateStr = formData.get('productState') as string | null;
    const productState = productStateStr ? parseInt(productStateStr) : null;
    const imageFile = formData.get('image') as File | null;

    if (!productName) {
      return c.json({ error: "Se requiere el nombre del producto" }, 400);
    }

    const apiKey = c.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY no está configurada');
      return c.json({ 
        error: "API Key de OpenAI no configurada. Por favor configúrala en Settings → Secrets como OPENAI_API_KEY" 
      }, 500);
    }

    console.log('✅ OpenAI API Key encontrada, longitud:', apiKey.length);

    // Build context string
    let contextString = `Producto: "${productName}"`;
    if (brand) contextString += `\nMarca: ${brand}`;
    contextString += `\nCondición: ${condition || 'Nuevo'}`;
    if (condition === 'Usado' && productState) {
      const stateDescriptions: Record<number, string> = {
        5: 'Como nuevo',
        4: 'Muy buen estado',
        3: 'Buen estado',
        2: 'Estado aceptable',
        1: 'Detalles visibles'
      };
      contextString += `\nEstado: ${productState}/5 estrellas (${stateDescriptions[productState]})`;
    }

    console.log('📝 Contexto del producto:', contextString);

    // Convert image to base64 if provided
    let imageBase64: string | null = null;
    let imageMimeType: string | null = null;
    if (imageFile) {
      try {
        const imageBuffer = await imageFile.arrayBuffer();
        imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
        imageMimeType = imageFile.type;
        console.log('🖼️ Imagen procesada:', imageMimeType, 'tamaño:', imageBuffer.byteLength, 'bytes');
      } catch (imgError) {
        console.warn('⚠️ Error procesando imagen, usando solo texto:', imgError);
        imageBase64 = null;
        imageMimeType = null;
      }
    } else {
      console.log('📄 Sin imagen, generación solo con texto');
    }

    // Build prompt for OpenAI
    const systemPrompt = `Eres un copywriter experto para e-commerce salvadoreño. Generas descripciones ESPECÍFICAS y VENDEDORAS en formato de bullet points con emojis.`;
    
    const userPrompt = `${contextString}

${imageBase64 ? `🔍 ANALIZA LA IMAGEN:
- Observa CUIDADOSAMENTE la foto y describe lo que VES
- Identifica: material, color, textura, diseño, estado físico
- Menciona detalles específicos visibles en la imagen
- FUSIONA lo que ves con la información del producto

` : ''}${condition === 'Nuevo' 
  ? `ENFOQUE PRODUCTO NUEVO:
- Resalta ${imageBase64 ? 'lo que ves en la imagen y ' : ''}la garantía de ser nuevo
- Menciona empaque original/presentación${imageBase64 ? ' visible' : ''}
- Destaca calidad de ${brand ? `marca ${brand}` : 'fábrica'}
`
  : `ENFOQUE PRODUCTO USADO (${productState} ⭐):
- SÉ HONESTO sobre el estado${imageBase64 ? ' visible en la foto' : ''} según ${productState} estrellas
- ${imageBase64 ? 'Describe el estado físico que observas' : 'Describe estado estimado'}
- Resalta valor: ${brand ? `marca ${brand} auténtica` : 'calidad comprobada'} a mejor precio
`}

FORMATO OBLIGATORIO:
- Máximo 5 bullet points (3-5)
- Cada punto con emoji apropiado
- Máximo 10 palabras por punto
- Tono profesional pero cercano

Genera SOLO los bullet points con emojis. Sin título ni texto extra.`;

    // Build request body for OpenAI API
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // Add image if available (OpenAI vision)
    if (imageBase64 && imageMimeType) {
      messages[1] = {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { 
            type: 'image_url', 
            image_url: { 
              url: `data:${imageMimeType};base64,${imageBase64}`,
              detail: 'high'
            } 
          }
        ]
      };
      console.log('📸 Imagen agregada al request');
    }

    const requestBody = {
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.9,
      max_tokens: 200,
    };
    
    console.log('🚀 Enviando request a OpenAI API...');
    console.log('🔗 Endpoint: https://api.openai.com/v1/chat/completions');
    console.log('🔑 API Key configurada:', apiKey.substring(0, 7) + '...');
    console.log('📦 Modelo:', requestBody.model);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de API OpenAI (Status:', response.status, ')');
      console.error('❌ Response completo:', errorText);
      
      // Friendly error message for customers
      let errorMessage = '🤖 IA en mantenimiento, por favor escribe la descripción manualmente';
      
      try {
        const errorData = JSON.parse(errorText);
        console.error('❌ Error detallado:', JSON.stringify(errorData, null, 2));
        
        // Only show specific messages for configuration errors
        if (errorData.error?.type === 'invalid_request_error') {
          errorMessage = 'Error en la solicitud a OpenAI. Verifica OPENAI_API_KEY en Settings → Secrets';
        } else if (response.status === 401) {
          errorMessage = 'API Key de OpenAI inválida. Verifica OPENAI_API_KEY en Settings → Secrets';
        } else if (response.status === 429) {
          errorMessage = 'Cuota de API excedida. Espera unos minutos e intenta nuevamente';
        }
      } catch (parseError) {
        console.error('⚠️ No se pudo parsear error JSON:', errorText);
      }
      
      console.error('📤 Enviando al cliente:', errorMessage);
      
      return c.json({ 
        error: errorMessage
      }, response.status === 429 ? 429 : 500);
    }

    const data = await response.json() as any;
    console.log('✅ Response exitoso de OpenAI');

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('❌ Response inválido:', JSON.stringify(data, null, 2));
      throw new Error('La IA no devolvió un formato válido');
    }

    // Extract text from OpenAI response
    const description = data.choices[0].message.content.trim();

    console.log('✅ Descripción generada:', description);

    if (!description) {
      throw new Error('La IA no generó texto');
    }

    return c.json({ description });

  } catch (error) {
    console.error("💥 Error general en endpoint:", error);
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // Friendly error for customers
    return c.json({ 
      error: "🤖 IA en mantenimiento, por favor escribe la descripción manualmente"
    }, 500);
  }
});

export default router;
