package game

import (
	"math"
)

// CalculateDistance calculates the great-circle distance between two points on the Earth's surface
// using the Haversine formula. Returns distance in kilometers.
func CalculateDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371.0 // Earth's radius in kilometers
	dLat := ((lat2 - lat1) * math.Pi) / 180.0
	dLng := ((lng2 - lng1) * math.Pi) / 180.0

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos((lat1*math.Pi)/180.0)*
			math.Cos((lat2*math.Pi)/180.0)*
			math.Sin(dLng/2)*math.Sin(dLng/2)

	c := 2.0 * math.Atan2(math.Sqrt(a), math.Sqrt(1.0-a))
	distance := R * c

	return distance
}

// CalculateScore calculates the score gained for a given distance in kilometers.
func CalculateScore(distance float64) int {
	if distance <= 1.0 {
		return 5000
	}

	var score float64

	if distance <= 10.0 {
		// 1km to 10km: Interpolates from 5000 down to 4500
		ratio := (distance - 1.0) / 9.0
		score = 5000.0 - ratio*500.0
	} else if distance <= 50.0 {
		// 10km to 50km: Interpolates from 4500 down to 3500
		ratio := (distance - 10.0) / 40.0
		score = 4500.0 - ratio*1000.0
	} else if distance <= 250.0 {
		// 50km to 250km: Interpolates from 3500 down to 2500
		ratio := (distance - 50.0) / 200.0
		score = 3500.0 - ratio*1000.0
	} else if distance <= 1000.0 {
		// 250km to 1000km: Interpolates from 2500 down to 1000
		ratio := (distance - 250.0) / 750.0
		score = 2500.0 - ratio*1500.0
	} else {
		// > 1000km: Smooth exponential decay from 1000 points.
		score = 1000.0 * math.Exp(-0.0003*(distance-1000.0))
	}

	finalScore := int(math.Max(0.0, math.Min(5000.0, math.Round(score))))
	return finalScore
}
