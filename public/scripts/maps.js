/* global google */

export async function initGoogleMaps() {
  const { Map } = await google.maps.importLibrary('maps');
  // const { Autocomplete } = await google.maps.importLibrary('places');

  return {
    /**
     *
     *
     * @param {string} mapSelector - CSS selector for the map element
     * @param {{lat: number, lng: number}} originLocation - Location of the origin
     * @param {{lat: number, lng: number}} destinationLocation - Location of the destination
     * @returns {void}
     */
    async plotRouteOnMap(mapSelector, originLocation, destinationLocation) {
      return new Promise((resolve, reject) => {
        try {
          const mapElement = document.querySelector(mapSelector);
          if (!mapElement) {
            console.error(`Map element not found for selector: ${mapSelector}`);
            return;
          }

          const map = new Map(mapElement, {
            center: originLocation,
            zoom: 12,
          });

          const directionsService = new google.maps.DirectionsService();
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
          });

          const request = {
            origin: originLocation,
            destination: destinationLocation,
            travelMode: google.maps.TravelMode.DRIVING,
          };

          directionsService.route(request, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK) {
              directionsRenderer.setDirections(result);

              const bounds = new google.maps.LatLngBounds();
              bounds.extend(originLocation);
              bounds.extend(destinationLocation);
              map.fitBounds(bounds);

              resolve(result);
            } else {
              console.error('Failed to calculate route:', status);
            }
          });
        } catch (error) {
          reject(error);
        }
      });
    },
  };
}
