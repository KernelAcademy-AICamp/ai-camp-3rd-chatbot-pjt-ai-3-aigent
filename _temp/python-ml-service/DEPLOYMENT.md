# TrendWhiz v3.0 ML Service - Deployment Guide

## Overview

This guide covers deploying the high-accuracy Python ML prediction service using Prophet and NeuralProphet models.

**Expected Performance:**
- Prophet: MAPE < 12%
- NeuralProphet: MAPE < 8% (55-92% better than Prophet)
- v2.0 Ensemble: MAPE 8-15%

---

## 📋 Pre-Deployment Checklist

- [ ] Python 3.10+ installed (for local testing)
- [ ] Docker installed (for containerized deployment)
- [ ] Supabase CLI installed
- [ ] GitHub repository access

---

## 🧪 Local Testing

### Step 1: Install Dependencies

```bash
cd python-ml-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Run Service Locally

```bash
# Start the service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Service will be available at http://localhost:8000
```

### Step 3: Test the Service

```bash
# In a new terminal
python test_service.py
```

**Expected Output:**
```
🚀 Starting TrendWhiz ML Service Tests

Testing /health endpoint...
Status: 200
Response: {'status': 'healthy', 'timestamp': '2025-12-08T...'}

Testing /predict endpoint with Prophet...
Status: 200
Success: True

Keyword: 실리콘 주걱
Model: Prophet
Accuracy Estimate: MAPE < 12% (Prophet)
Growth Rate: 12.5%
Model Confidence: 85%

✅ All tests passed!
```

---

## 🐳 Docker Deployment (Local)

### Step 1: Build and Run with Docker Compose

```bash
cd python-ml-service

# Build and start the service
docker-compose up --build

# Or run in detached mode
docker-compose up -d
```

### Step 2: Verify Health

```bash
curl http://localhost:8000/health
```

### Step 3: Stop Service

```bash
docker-compose down
```

---

## ☁️ Cloud Deployment Options

### Option 1: Railway (Recommended)

**Why Railway?**
- Free tier available ($5/month credit)
- Automatic HTTPS
- Easy environment variable management
- GitHub integration

**Steps:**

1. **Push to GitHub** (if not already done):
```bash
git add python-ml-service/
git commit -m "Add v3.0 Python ML service"
git push origin main
```

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app/)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Dockerfile and deploy

3. **Get Service URL:**
   - Railway will provide a URL like: `https://trendwhiz-ml-service.railway.app`
   - Copy this URL for Supabase configuration

4. **Set Environment Variables** (if needed):
   - Go to Railway project settings
   - Add: `PYTHONUNBUFFERED=1`

### Option 2: Render

**Steps:**

1. Go to [render.com](https://render.com/)
2. New Web Service → Connect GitHub repository
3. Configure:
   - **Root Directory**: `python-ml-service`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Deploy
5. Copy the service URL (e.g., `https://trendwhiz-ml.onrender.com`)

### Option 3: Fly.io

**Steps:**

```bash
cd python-ml-service

# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app
flyctl launch --name trendwhiz-ml-service

# Deploy
flyctl deploy

# Get URL
flyctl info
```

### Option 4: Google Cloud Run

**Steps:**

```bash
cd python-ml-service

# Build and push to GCP Container Registry
gcloud builds submit --tag gcr.io/YOUR_PROJECT/trendwhiz-ml

# Deploy to Cloud Run
gcloud run deploy trendwhiz-ml \
  --image gcr.io/YOUR_PROJECT/trendwhiz-ml \
  --platform managed \
  --region asia-northeast3 \
  --allow-unauthenticated

# Get URL
gcloud run services describe trendwhiz-ml --region asia-northeast3
```

---

## 🔗 Integrate with Supabase Edge Functions

### Step 1: Set ML Service URL

```bash
# Set the environment variable in Supabase
supabase secrets set ML_SERVICE_URL=https://your-ml-service-url.com

# Example:
supabase secrets set ML_SERVICE_URL=https://trendwhiz-ml-service.railway.app
```

### Step 2: Deploy predict-trend-v3 Edge Function

```bash
# Deploy the Edge Function
supabase functions deploy predict-trend-v3

# Verify deployment
supabase functions list
```

### Step 3: Test Integration

```bash
# Test the Edge Function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/predict-trend-v3 \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "테스트 키워드",
    "historicalData": [
      {"date": "2024-01-01", "value": 100},
      {"date": "2024-02-01", "value": 120},
      {"date": "2024-03-01", "value": 140}
    ],
    "predictionMonths": 3,
    "model": "prophet"
  }'
```

---

## 📊 Performance Benchmarking

### Compare v2.0 vs v3.0

Run the benchmark test:

```bash
cd python-ml-service
python test_service.py
```

The script includes a `benchmark_v2_vs_v3()` function that compares:

**v2.0 (Ensemble: Holt-Winters + STL + WMA)**
- MAPE: 8-15%
- Speed: ~200ms
- Deployment: Supabase Edge Function only

**v3.0 (Prophet)**
- MAPE: <12%
- Speed: ~300ms
- Deployment: Python microservice

**v3.0 (NeuralProphet)**
- MAPE: <8%
- Speed: ~800ms (first run), ~200ms (cached)
- Deployment: Python microservice

### Real-World Testing

1. **Collect historical data** from your Coupang keywords
2. **Run predictions** with all models
3. **Wait for actual future data** to arrive
4. **Calculate MAPE**:
   ```python
   mape = mean(abs((actual - predicted) / actual)) * 100
   ```

---

## 🔧 Configuration Options

### Model Selection

The `/predict` endpoint supports multiple models:

| Model | When to Use | Expected MAPE | Speed |
|-------|-------------|---------------|-------|
| `prophet` | Default, fast, reliable | <12% | Fast |
| `neuralprophet` | Maximum accuracy, more data | <8% | Moderate |
| `auto` | Let system decide | <8-12% | Adaptive |
| `ensemble` | (Future) Combine both | <6% | Slow |

### Confidence Levels

```json
{
  "confidence_level": 0.95  // 95% confidence interval (default)
}
```

Options: 0.80 (80%), 0.90 (90%), 0.95 (95%), 0.99 (99%)

---

## 🚨 Troubleshooting

### Issue 1: ML Service Timeout

**Symptom:** Edge Function returns "ML service temporarily unavailable"

**Solutions:**
1. Check ML service health: `curl https://your-ml-service/health`
2. Check Railway/Render logs for errors
3. Increase timeout in predict-trend-v3 Edge Function
4. Service will automatically fallback to v2.0

### Issue 2: Low Accuracy Predictions

**Symptom:** MAPE > 15%

**Solutions:**
1. Ensure at least 12-18 months of historical data
2. Try `neuralprophet` model for complex patterns
3. Check for data quality issues (outliers, missing values)
4. Verify seasonality patterns match product lifecycle

### Issue 3: NeuralProphet Not Available

**Symptom:** Error "NeuralProphet not available"

**Solutions:**
1. Check if NeuralProphet is in requirements.txt
2. Rebuild Docker image: `docker-compose build --no-cache`
3. Service will automatically fallback to Prophet

### Issue 4: Slow Predictions

**Symptom:** Predictions take >5 seconds

**Solutions:**
1. Use `prophet` instead of `neuralprophet` for faster results
2. Reduce `epochs` in NeuralProphet (line 170 in main.py)
3. Implement caching for repeated keywords
4. Scale ML service horizontally (multiple instances)

---

## 🔒 Security Checklist

- [ ] ML service uses HTTPS in production
- [ ] CORS configured with whitelist origins only
- [ ] Input validation enabled (max 100 chars keyword, 1-24 months)
- [ ] No sensitive data logged
- [ ] Supabase secrets used for ML_SERVICE_URL
- [ ] Rate limiting configured (if using public API)

---

## 📈 Monitoring & Maintenance

### Health Checks

Set up monitoring on:
- `/health` endpoint - should return 200 every 30s
- Response time - should be <2s for 90th percentile
- Error rate - should be <1%

### Logging

Check logs for:
```bash
# Railway
railway logs

# Render
# View logs in dashboard

# Docker
docker-compose logs -f ml-service
```

### Updates

To update the model:

```bash
# Update main.py with model improvements
git add python-ml-service/main.py
git commit -m "Improve Prophet parameters"
git push

# Railway/Render will auto-deploy
# Or manually redeploy:
docker-compose up --build -d
```

---

## 📊 Expected Results

### Accuracy Improvements

| Metric | v2.0 Ensemble | v3.0 Prophet | v3.0 NeuralProphet |
|--------|---------------|--------------|---------------------|
| MAPE | 8-15% | 8-12% | 5-8% |
| RMSE | Medium | Low | Very Low |
| MAE | Medium | Low | Very Low |

### Confidence Metrics

- **Model Confidence**: 75-95% (based on data quality)
- **Growth Detection**: Improved trend analysis
- **Seasonality**: Automatic detection with strength measurement

---

## 🎯 Production Checklist

Before switching users to v3.0:

- [ ] ML service deployed and healthy
- [ ] ML_SERVICE_URL configured in Supabase
- [ ] predict-trend-v3 deployed and tested
- [ ] Benchmarks show >20% accuracy improvement
- [ ] Fallback to v2.0 tested and working
- [ ] Frontend updated to call v3 endpoint
- [ ] Error monitoring configured
- [ ] Documentation updated

---

## 📞 Support

If you encounter issues:

1. Check ML service logs
2. Test `/health` endpoint
3. Verify Supabase Edge Function logs: `supabase functions logs predict-trend-v3`
4. Review test_service.py for debugging examples

---

## 🚀 Next Steps

1. ✅ Deploy ML service to Railway/Render
2. ✅ Configure Supabase secrets
3. ✅ Deploy predict-trend-v3
4. ⏳ Update frontend to use v3
5. ⏳ Monitor performance for 1 week
6. ⏳ Compare v2.0 vs v3.0 accuracy on real data
7. ⏳ Gradually migrate all users to v3.0

**Estimated Time to Production:** 2-4 hours
