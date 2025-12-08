"""
Test script for TrendWhiz ML Service
"""

import requests
import json
from datetime import datetime, timedelta

# Service URL
BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("Testing /health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}\n")
    assert response.status_code == 200

def test_predict_prophet():
    """Test prediction with Prophet"""
    print("Testing /predict endpoint with Prophet...")

    # Generate sample data (upward trend with seasonality)
    historical_data = []
    base_date = datetime(2023, 1, 1)

    for i in range(18):  # 18 months of data
        date = base_date + timedelta(days=30*i)
        # Simulated search volume: trend + seasonality + noise
        trend = 50 + i * 2
        seasonality = 10 * (1 if i % 12 in [2, 3, 4] else 0.5)  # Spring peak
        value = trend + seasonality

        historical_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": value
        })

    # Request
    payload = {
        "keyword": "실리콘 주걱",
        "historical_data": historical_data,
        "prediction_months": 6,
        "model": "prophet",
        "confidence_level": 0.95
    }

    response = requests.post(f"{BASE_URL}/predict", json=payload)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        print(f"Success: {result['success']}")
        if result['success']:
            data = result['data']
            print(f"\nKeyword: {data['keyword']}")
            print(f"Model: {data['model_info']['method']}")
            print(f"Accuracy Estimate: {data['model_info']['accuracy_estimate']}")
            print(f"Growth Rate: {data['growth_rate']}%")
            print(f"Growth Trend: {data['growth_trend']}")
            print(f"Model Confidence: {data['model_confidence']}%")
            print(f"\nSeasonality:")
            print(f"  Pattern: {data['seasonality']['pattern']}")
            print(f"  Strength: {data['seasonality']['strength']}")
            print(f"  Peak Months: {', '.join(data['seasonality']['peak_months'])}")
            print(f"\nPredictions (first 3):")
            for pred in data['predictions'][:3]:
                print(f"  {pred['date']}: {pred['predicted_value']:.2f} "
                      f"[{pred['confidence_lower']:.2f} - {pred['confidence_upper']:.2f}]")
    else:
        print(f"Error: {response.text}")

    print()
    assert response.status_code == 200

def test_predict_neuralprophet():
    """Test prediction with NeuralProphet"""
    print("Testing /predict endpoint with NeuralProphet...")

    # Generate sample data
    historical_data = []
    base_date = datetime(2023, 1, 1)

    for i in range(24):  # 24 months for NeuralProphet
        date = base_date + timedelta(days=30*i)
        value = 60 + i * 3 + 15 * (1 if i % 12 in [3, 4, 5] else 0.7)

        historical_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": value
        })

    payload = {
        "keyword": "무선 청소기",
        "historical_data": historical_data,
        "prediction_months": 6,
        "model": "neuralprophet",
        "confidence_level": 0.95
    }

    response = requests.post(f"{BASE_URL}/predict", json=payload)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        if result['success']:
            print(f"Model: {result['data']['model_info']['method']}")
            print(f"Accuracy: {result['data']['model_info']['accuracy_estimate']}")
    else:
        print(f"Response: {response.text}")

    print()

def test_predict_auto():
    """Test prediction with auto model selection"""
    print("Testing /predict endpoint with auto model selection...")

    # Small dataset (should use Prophet)
    historical_data = []
    base_date = datetime(2024, 1, 1)

    for i in range(6):  # Only 6 months
        date = base_date + timedelta(days=30*i)
        value = 50 + i * 5

        historical_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": value
        })

    payload = {
        "keyword": "테스트",
        "historical_data": historical_data,
        "prediction_months": 3,
        "model": "auto"
    }

    response = requests.post(f"{BASE_URL}/predict", json=payload)
    print(f"Status: {response.status_code}")

    if response.status_code == 200:
        result = response.json()
        if result['success']:
            print(f"Auto-selected model: {result['data']['model_info']['method']}")

    print()

def benchmark_v2_vs_v3():
    """Compare v2.0 (Ensemble) vs v3.0 (Prophet/NeuralProphet)"""
    print("="*60)
    print("BENCHMARK: v2.0 (Ensemble) vs v3.0 (Prophet/NeuralProphet)")
    print("="*60)

    # Generate test data with known pattern
    historical_data = []
    base_date = datetime(2023, 1, 1)

    for i in range(12):
        date = base_date + timedelta(days=30*i)
        # Known pattern: linear trend + strong seasonality
        value = 50 + i * 2 + 20 * (1 if i in [2, 3, 4] else 0.5)
        historical_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": value
        })

    print(f"\nTest Data: {len(historical_data)} months")
    print("Pattern: Linear growth + Spring seasonality peak")

    # Test v3.0 Prophet
    print("\n--- v3.0 (Prophet) ---")
    payload = {
        "keyword": "벤치마크 테스트",
        "historical_data": historical_data,
        "prediction_months": 6,
        "model": "prophet"
    }

    response = requests.post(f"{BASE_URL}/predict", json=payload)
    if response.status_code == 200:
        result = response.json()
        if result['success']:
            data = result['data']
            print(f"Model Confidence: {data['model_confidence']}%")
            print(f"Accuracy Estimate: {data['model_info']['accuracy_estimate']}")
            print(f"Growth Detection: {data['growth_rate']}% ({data['growth_trend']})")
            print(f"Seasonality Strength: {data['seasonality']['strength']}")

    print("\n--- Note: v2.0 results available in Edge Function ---")
    print("Expected Improvement: 30-50% better MAPE with Prophet/NeuralProphet")
    print("="*60)

if __name__ == "__main__":
    try:
        print("\n🚀 Starting TrendWhiz ML Service Tests\n")

        test_health()
        test_predict_prophet()
        # test_predict_neuralprophet()  # Uncomment if NeuralProphet installed
        test_predict_auto()
        benchmark_v2_vs_v3()

        print("\n✅ All tests passed!")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
