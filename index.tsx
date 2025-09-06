/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { html } from 'htm/preact';
import { GoogleGenAI, Type } from '@google/genai';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error('API_KEY environment variable not set');
}
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Fix: Moved component definitions before the App component to resolve reference errors
// because components defined as `const` are not hoisted.
const Header = () => {
  return html`
    <header class="app-header">
      <div class="logo-container">
        <img src="/logo.png" alt="ClesdafedGaming 'C' Logo" class="logo" />
        <h1 class="shop-title">ClesdafedGaming Shop</h1>
      </div>
      <nav class="navigation">
        <a href="#" class="active">Home</a>
        <a href="#">Apparel</a>
        <a href="#">Accessories</a>
        <a href="https://youtube.com/@clesdafedGaming" target="_blank" rel="noopener noreferrer" aria-label="ClesdafedGaming YouTube Channel">
          <img src="https://www.youtube.com/s/desktop/014dbbed/img/favicon_32x32.png" alt="YouTube Logo" class="youtube-logo"/>
        </a>
      </nav>
    </header>
  `;
};

const ProductCard = ({ product }) => {
  const { name, description, price, imageUrl } = product;
  return html`
    <div class="product-card">
      <img src=${imageUrl} alt="AI generated image of ${name}" class="product-image" />
      <div class="product-info">
        <h2 class="product-name">${name}</h2>
        <p class="product-description">${description}</p>
        <div class="product-footer">
          <p class="product-price">$${price.toFixed(2)}</p>
          <button class="buy-button" aria-label="Add ${name} to cart">Add to Cart</button>
        </div>
      </div>
    </div>
  `;
};

const LiveChat = ({ isChatOpen, setChatOpen }) => {
  return html`
    <div class="live-chat">
      <div class="live-chat-bubble" onClick=${() => setChatOpen(!isChatOpen)} role="button" aria-label="Toggle live chat">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>
      </div>
      <div class=${`chat-window ${isChatOpen ? 'open' : ''}`}>
        <div class="chat-header">
          <h3>Live Support</h3>
          <button class="chat-close-btn" onClick=${() => setChatOpen(false)} aria-label="Close chat">&times;</button>
        </div>
        <div class="chat-body">
          <p><strong>Support:</strong> Welcome to ClesdafedGaming Shop! How can I help you today?</p>
        </div>
        <div class="chat-footer">
          <input type="text" placeholder="Type your message..." />
        </div>
      </div>
    </div>
  `;
};

const App = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isChatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');
        
        const textPrompt = `
          You are an AI for ClesdafedGaming, a gaming YouTube channel. Generate a list of 5 unique, cool, and desirable merchandise items for the channel's online store. 
          The items should be apparel like t-shirts. 
          For each item, provide a catchy, gaming-related name, a brief and exciting description (under 15 words). and a price.
        `;

        const textResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: textPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'The creative name of the product.' },
                  description: { type: Type.STRING, description: 'A short, punchy product description.' },
                  price: { type: Type.NUMBER, description: 'The price of the product in USD.' },
                },
                required: ['name', 'description', 'price'],
              },
            },
          },
        });
        
        const productTextData = JSON.parse(textResponse.text);

        const productPromises = productTextData.map(async (product) => {
          const imagePrompt = `A professional ecommerce product photograph of a t-shirt featuring a clean, modern, minimalist graphic design inspired by "${product.name}". The t-shirt is neatly displayed on a neutral, light gray background. High-quality, commercial photography.`;
          
          const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: imagePrompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/png',
              aspectRatio: '1:1',
            },
          });

          const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
          const imageUrl = `data:image/png;base64,${base64ImageBytes}`;

          return { ...product, imageUrl };
        });

        const productsWithImages = await Promise.all(productPromises);
        setProducts(productsWithImages);

      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to generate merchandise. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return html`
    <${Header} />
    <main class="main-content">
      ${loading && html`
        <div class="loader">
          <p>Generating Your Custom ClesdafedGaming Gear & Designs...</p>
        </div>
      `}
      ${error && html`<div class="error">${error}</div>`}
      ${!loading && !error && html`
        <div class="products-grid">
          ${products.map(product => html`<${ProductCard} key=${product.name} product=${product} />`)}
        </div>
      `}
    </main>
    <${LiveChat} isChatOpen=${isChatOpen} setChatOpen=${setChatOpen} />
  `;
};

render(html`<${App} />`, document.getElementById('root'));