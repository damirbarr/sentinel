import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sentinel.policy.decision_engine import DecisionEngine
from sentinel.models.events import ActiveConstraint, WeatherPayload, GeofencePayload, NetworkPayload, LatLng
from datetime import datetime, timezone

def _ts():
    return datetime.now(timezone.utc).isoformat()

def weather(condition, severity):
    return ActiveConstraint(id='w1', type='WEATHER', payload=WeatherPayload(condition=condition, severity=severity), createdAt=_ts())

def geofence(geo_type, polygon):
    return ActiveConstraint(id='g1', type='GEOFENCE', payload=GeofencePayload(type=geo_type, polygon=polygon), createdAt=_ts())

def network(severity, vehicle_id=None):
    return ActiveConstraint(id='n1', type='NETWORK', payload=NetworkPayload(severity=severity, vehicleId=vehicle_id), createdAt=_ts())

def test_normal_no_constraints():
    e = DecisionEngine('v1')
    d, c, affecting, nearby = e.evaluate([], 37.77, -122.4)
    assert d == 'NORMAL' and c == []

def test_heavy_rain_high_stops():
    e = DecisionEngine('v1')
    d, c, affecting, nearby = e.evaluate([weather('HEAVY_RAIN', 'HIGH')], 37.7, -122.4)
    assert d == 'SAFE_STOP_RECOMMENDED'
    assert 'WEATHER_HEAVY_RAIN' in c

def test_heavy_rain_low_degrades():
    e = DecisionEngine('v1')
    d, c, affecting, nearby = e.evaluate([weather('HEAVY_RAIN', 'LOW')], 37.7, -122.4)
    assert d == 'DEGRADED_SPEED'

def test_fog_moderate_degrades():
    e = DecisionEngine('v1')
    d, c, affecting, nearby = e.evaluate([weather('FOG', 'MODERATE')], 37.7, -122.4)
    assert d == 'DEGRADED_SPEED'
    assert 'WEATHER_FOG' in c

def test_network_lost_stops():
    e = DecisionEngine('v1')
    d, c, affecting, nearby = e.evaluate([network('LOST')], 37.7, -122.4)
    assert d == 'SAFE_STOP_RECOMMENDED'
    assert 'NETWORK_LOST' in c

def test_network_lost_targeted_applies():
    e = DecisionEngine('v1')
    d, c, affecting, nearby = e.evaluate([network('LOST', 'v1')], 37.7, -122.4)
    assert d == 'SAFE_STOP_RECOMMENDED'

def test_network_lost_other_ignored():
    e = DecisionEngine('v1')
    d, c, affecting, nearby = e.evaluate([network('LOST', 'v2')], 37.7, -122.4)
    assert d == 'NORMAL'

def test_inside_forbidden_zone_stops():
    poly = [LatLng(37.77, -122.43), LatLng(37.78, -122.43), LatLng(37.78, -122.41)]
    e = DecisionEngine('v1')
    d, c, affecting, nearby = e.evaluate([geofence('FORBIDDEN', poly)], 37.775, -122.425)
    assert d == 'SAFE_STOP_RECOMMENDED'
    assert 'IN_GEOFENCE_FORBIDDEN_ZONE' in c

def test_outside_geofence_normal():
    poly = [LatLng(40.0, -74.0), LatLng(40.1, -74.0), LatLng(40.1, -73.9)]
    e = DecisionEngine('v1')
    d, c, affecting, nearby = e.evaluate([geofence('FORBIDDEN', poly)], 37.7749, -122.4194)
    assert d == 'NORMAL'

def test_multi_factor_risk():
    e = DecisionEngine('v1')
    d, c, affecting, nearby = e.evaluate([weather('FOG', 'MODERATE'), network('DEGRADED')], 37.7, -122.4)
    assert 'MULTI_FACTOR_RISK' in c

def test_affecting_vs_nearby_ids():
    poly = [LatLng(37.77, -122.43), LatLng(37.78, -122.43), LatLng(37.78, -122.41)]
    e = DecisionEngine('v1')
    # Vehicle inside forbidden zone → geofence is affecting; network for other vehicle → nearby
    constraints = [
        geofence('FORBIDDEN', poly),
        network('LOST', 'v2'),
    ]
    d, c, affecting, nearby = e.evaluate(constraints, 37.775, -122.425)
    assert 'g1' in affecting
    assert 'n1' in nearby
