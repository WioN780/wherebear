/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 in degrees
 * @param lng1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lng2 Longitude of point 2 in degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Calculates the score gained for a given distance in kilometers.
 * Implements smooth score interpolation based on distance thresholds:
 * - 0 to 1 km: 5000 points
 * - 1 to 10 km: 4500 to 5000 points (interpolated)
 * - 10 to 50 km: 3500 to 4500 points (interpolated)
 * - 50 to 250 km: 2500 to 3500 points (interpolated)
 * - 250 to 1000 km: 1000 to 2500 points (interpolated)
 * - > 1000 km: Smooth exponential decay from 1000 points down to 0-500 points
 *
 * @param distance Distance in kilometers
 * @returns Score as an integer between 0 and 5000
 */
export function calculateScore(distance: number): number {
  if (distance <= 1) {
    return 5000;
  }

  let score = 0;

  if (distance <= 10) {
    // 1km to 10km: Interpolates from 5000 down to 4500
    const ratio = (distance - 1) / 9;
    score = 5000 - ratio * 500;
  } else if (distance <= 50) {
    // 10km to 50km: Interpolates from 4500 down to 3500
    const ratio = (distance - 10) / 40;
    score = 4500 - ratio * 1000;
  } else if (distance <= 250) {
    // 50km to 250km: Interpolates from 3500 down to 2500
    const ratio = (distance - 50) / 200;
    score = 3500 - ratio * 1000;
  } else if (distance <= 1000) {
    // 250km to 1000km: Interpolates from 2500 down to 1000
    const ratio = (distance - 250) / 750;
    score = 2500 - ratio * 1500;
  } else {
    // > 1000km: Smooth exponential decay from 1000 points.
    // e.g., at 2500km it's ~630 pts, at 5000km it's ~300 pts, at 10000km it's ~67 pts.
    score = 1000 * Math.exp(-0.0003 * (distance - 1000));
  }

  return Math.max(0, Math.min(5000, Math.round(score)));
}
