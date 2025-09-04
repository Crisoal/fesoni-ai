# Fesoni — Your AI Shopping Assistant That Gets Your Vibe

## 🎨 What You're Building

Fesoni is an AI shopping assistant powered by enterprise-grade APIs that creates a seamless, scalable experience for aesthetic-based product discovery. Think of it as having a super-smart friend who knows your taste and can recommend products from Amazon based on your cultural preferences, backed by professional API infrastructure.

**Platform Type**: A web app with a voice-enabled chat interface where users naturally describe their aesthetic, and the AI finds matching products from Amazon through RapidAPI, with enterprise-level API management, async processing, and personalized document generation.

**Simple Concept**: Instead of browsing through endless product categories, you just tell Fesoni about your vibe using voice or text. The system processes your request through professional API infrastructure, generates personalized style guides, and delivers products that match your aesthetic from Amazon's vast catalogue.

## 🏗️ Technical Architecture

### OpenAI Integration
- **Aesthetic Analysis**: Use GPT-4 to parse cultural references and extract specific style preferences from user input
- **Intent Recognition**: Understand user needs and translate abstract vibes into concrete product categories
- **Product Descriptions**: Generate personalized descriptions explaining how products fit the user's aesthetic

### Amazon RapidAPI Integration
- **Real Product Search**: Direct integration with Amazon's product catalog through RapidAPI
- **Cultural Context Matching**: Advanced algorithm to match products with user's aesthetic preferences
- **Product Details**: Fetch comprehensive product information including ratings, prices, and images

### Kong API Gateway Integration
- **API Traffic Management**: Route all external API calls through Kong's gateway for centralized management
- **Rate Limiting**: Smart rate limiting to optimize API usage and prevent quota overruns
- **Service Discovery**: Automatic routing and load balancing for API services

### LavinMQ Message Queue Integration
- **Async Product Search**: Queue multiple Amazon product searches in parallel for complex aesthetics
- **Real-time Notifications**: Send instant updates to users about processing status and results
- **Task Management**: Handle background processing for document generation and enhanced searches

### Foxit Document APIs Integration
- **Personalized Style Guides**: Generate beautiful PDF lookbooks based on user's aesthetic preferences
- **Document Optimization**: Compress and optimize style guides for easy sharing and mobile viewing
- **Multi-format Support**: Generate both PDF and HTML previews of style guides

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- API keys for OpenAI, RapidAPI, and Foxit
- Optional: Kong Gateway and LavinMQ for enterprise features

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <your-repo-url>
   cd fesoni
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your API keys:
   ```env
   VITE_OPENAI_API_KEY=your-openai-api-key
   VITE_RAPIDAPI_KEY=your-rapidapi-key
   VITE_AMAZON_API_HOST=axesso-axesso-amazon-data-service-v1.p.rapidapi.com
   VITE_FOXIT_API_KEY=your-foxit-api-key
   VITE_FOXIT_BASE_URL=https://na1.fusion.foxit.com
   
   # Optional enterprise features
   VITE_KONG_GATEWAY_URL=http://localhost:8000
   VITE_KONG_API_KEY=your-kong-api-key
   VITE_LAVINMQ_URL=amqps://username:password@host/vhost
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Test API integrations**:
   - Open the app in your browser
   - Click the Settings icon in the header
   - Run the "Test All APIs" button to verify connectivity

## 🔧 API Configuration

### Required APIs

#### OpenAI
- **Purpose**: Aesthetic analysis and product descriptions
- **Setup**: Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Model**: Uses GPT-4 for best results

#### RapidAPI (Amazon Data)
- **Purpose**: Real Amazon product search and details
- **Setup**: 
  1. Sign up at [RapidAPI](https://rapidapi.com/)
  2. Subscribe to "Amazon Data Scraper" by Axesso
  3. Get your RapidAPI key from the dashboard

#### Foxit Document APIs
- **Purpose**: PDF style guide generation
- **Setup**: Get API key from [Foxit Developers](https://developers.foxit.com/)
- **Features**: Document generation and optimization

### Optional Enterprise APIs

#### Kong API Gateway
- **Purpose**: API management, rate limiting, and routing
- **Setup**: Install Kong locally or use Kong Cloud
- **Benefits**: Centralized API management and monitoring

#### LavinMQ
- **Purpose**: Message queuing for async processing
- **Setup**: Use CloudAMQP or install LavinMQ locally
- **Benefits**: Background processing and real-time notifications

## 🎯 Usage Examples

### Basic Usage
```typescript
// Tell Fesoni about your aesthetic
"I love dark academia with vintage books and brass accents"

// Get personalized product recommendations
// Download a custom style guide PDF
```

### Voice Input
- Click the microphone button
- Speak naturally about your style preferences
- Fesoni processes your voice and finds matching products

### Advanced Features
- **Streaming Responses**: Real-time updates during processing
- **Cultural Context**: Advanced matching based on aesthetic keywords
- **Style Guides**: Downloadable PDF lookbooks
- **Async Processing**: Background searches for better performance

## 🧪 Testing

### Integration Tests
The app includes comprehensive integration tests for all APIs:

```bash
# Run through the UI
1. Open the app
2. Click Settings → Test All APIs
3. View results for each service

# Or run programmatically
import { integrationTestService } from './src/services/integrationTest';
const results = await integrationTestService.runFullIntegrationTest();
```

### Test Coverage
- ✅ OpenAI aesthetic analysis
- ✅ Amazon product search via RapidAPI
- ✅ Cultural context matching
- ✅ Document generation with Foxit
- ✅ Message queue operations
- ✅ API Gateway health checks
- ✅ End-to-end workflow

## 🔒 Security

- Environment variables are properly excluded from version control
- API keys are never exposed in client-side code
- Rate limiting prevents API abuse
- CORS and security headers configured

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── ChatInterface.tsx
│   ├── ProductCard.tsx
│   ├── VoiceInput.tsx
│   └── Header.tsx
├── services/           # API integrations
│   ├── openai.ts      # OpenAI GPT-4 integration
│   ├── amazon.ts      # RapidAPI Amazon search
│   ├── documentGeneration.ts  # Foxit PDF generation
│   ├── apiGateway.ts  # Kong API Gateway
│   ├── messageQueue.ts # LavinMQ integration
│   ├── orchestrationService.ts # Main workflow
│   └── integrationTest.ts # API testing
├── hooks/             # React hooks
│   ├── useFesoni.ts   # Main app logic
│   └── useVoiceRecognition.ts
└── types/             # TypeScript definitions
    └── index.ts
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Docker (Optional)
```bash
docker-compose up
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your API keys to `.env`
4. Test your changes with the integration test
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details