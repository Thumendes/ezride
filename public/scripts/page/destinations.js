/* global google, bootstrap */
import { destinationsRepository } from '../repositories/destinations.js';
import { dialog } from '../utils.js';
import { getLoggedUser } from '../utils.js';

async function loadDestinations() {
  try {
    const $destinationsList = document.querySelector('#destinations-list');
    const currentUser = getLoggedUser();
    
    const destinations = await destinationsRepository.getDestinationsByUser(currentUser.id);

    console.log('User destinations:', destinations);

    $destinationsList.innerHTML = destinations
      .map(
        (destination) => `<tr>
          <td><strong>${destination.name}</strong></td>
          <td class="text-truncate" style="max-width: 200px;" title="${destination.startAddress}">
            <i class="bi bi-geo-alt-fill text-success"></i> ${destination.startAddress}
          </td>
          <td class="text-truncate" style="max-width: 200px;" title="${destination.endAddress}">
            <i class="bi bi-geo-alt text-danger"></i> ${destination.endAddress}
          </td>
          <td>
            <i class="bi bi-clock text-primary"></i> ${destination.startTime}
          </td>
          <td>
            <div class="destination-actions">
              <button class="action-btn edit edit-button" data-id="${destination.id}" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="action-btn delete delete-button" data-id="${destination.id}" title="Excluir">
                <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
        </tr>`
      )
      .join('');

    setupDestinationsActions();

    return destinations;
  } catch (error) {
    console.error('Error loading destinations:', error);
  }
}

function setupDestinationsActions() {
  const $editButtons = document.querySelectorAll(
    '#destinations-list .edit-button'
  );

  for (const $button of $editButtons) {
    $button.addEventListener('click', async (event) => {
      const destinationId = event.target.dataset.id;
      console.log('Edit button clicked for destination ID:', destinationId);

      try {
        const destination =
          await destinationsRepository.getDestinationById(destinationId);

        const $form = document.querySelector('#destination-form');
        $form.name.value = destination.name;
        $form.startAddress.value = destination.startAddress;
        $form.startTime.value = destination.startTime;
        $form.endAddress.value = destination.endAddress;
        $form.startLat.value = destination.startLat;
        $form.startLng.value = destination.startLng;
        $form.endLat.value = destination.endLat;
        $form.endLng.value = destination.endLng;

        $form.dataset.editing = destinationId;

        const modal = new bootstrap.Modal(
          document.getElementById('destinationModal')
        );

        modal.show();

        // Initialize map if not already initialized
        if (!map) {
          initMap();
        } else {
          // Update markers and route
          const startLocation = new google.maps.LatLng(destination.startLat, destination.startLng);
          const endLocation = new google.maps.LatLng(destination.endLat, destination.endLng);

          if (startMarker) {
            startMarker.setPosition(startLocation);
          } else {
            startMarker = new google.maps.Marker({
              map,
              position: startLocation,
            });
          }

          if (endMarker) {
            endMarker.setPosition(endLocation);
          } else {
            endMarker = new google.maps.Marker({
              map,
              position: endLocation,
            });
          }

          // Calculate route
          calculateRoute();

          // Fit map to show both markers
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(startLocation);
          bounds.extend(endLocation);
          map.fitBounds(bounds);
        }
      } catch (error) {
        console.error('Error editing destination:', error);
      }
    });
  }

  const $deleteButtons = document.querySelectorAll(
    '#destinations-list .delete-button'
  );

  for (const $button of $deleteButtons) {
    $button.addEventListener('click', async (event) => {
      // Corrigir para pegar o data-id do botão, mesmo se clicar no ícone
      const destinationId = event.currentTarget.dataset.id;
      if (!destinationId) {
        alert('Erro ao identificar o destino para deletar.');
        return;
      }
      console.log('Delete button clicked for destination ID:', destinationId);

      const confirmed = await dialog.confirm(
        'Certeza que deseja apagar este destino?',
        {
          description: 'Essa ação não pode ser desfeita.',
          confirmText: 'Apagar',
          cancelText: 'Cancelar',
        }
      );

      if (!confirmed) return;

      try {
        await destinationsRepository.deleteDestination(destinationId);
        await loadDestinations();
      } catch (error) {
        console.error('Error deleting destination:', error);
        alert('Erro ao deletar destino.');
      }
    });
  }
}

function setupDestinationsForm() {
  const $form = document.querySelector('#destination-form');
  const $saveButton = document.querySelector('#nextStepBtn');

  $form.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  });

  $saveButton.addEventListener('click', async (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const startAddress = document.getElementById('startAddress').value;
    const startTime = document.getElementById('startTime').value;
    const endAddress = document.getElementById('endAddress').value;
    const startLat = document.getElementById('startLat').value;
    const startLng = document.getElementById('startLng').value;
    const endLat = document.getElementById('endLat').value;
    const endLng = document.getElementById('endLng').value;

    if (
      !name ||
      !startAddress ||
      !startTime ||
      !endAddress ||
      !startLat ||
      !startLng ||
      !endLat ||
      !endLng
    ) {
      alert(
        'Por favor, preencha todos os campos e selecione os endereços no mapa.'
      );
      return;
    }

    const currentUser = getLoggedUser();
    const payload = {
      name,
      startAddress,
      startLat: parseFloat(startLat),
      startLng: parseFloat(startLng),
      startTime,
      endAddress,
      endLat: parseFloat(endLat),
      endLng: parseFloat(endLng),
      userId: currentUser.id
    };

    const destinationId = $form.dataset.editing;

    try {
      if (destinationId) {
        await destinationsRepository.updateDestination(destinationId, payload);
      } else {
        await destinationsRepository.createDestination(payload);
      }

      $form.reset();
      await loadDestinations();

      const modal = bootstrap.Modal.getInstance(
        document.getElementById('destinationModal')
      );
      modal.hide();
    } catch (error) {
      console.error('Error saving destination:', error);
      alert('Erro ao salvar o destino. Por favor, tente novamente.');
    }
  });
}

// === GOOGLE MAPS INTEGRAÇÃO ===
let map,
  autocompleteOrigin,
  autocompleteDest,
  startMarker,
  endMarker,
  directionsService,
  directionsRenderer;

async function initMap() {
  const { Map } = await google.maps.importLibrary('maps');
  const { Autocomplete } = await google.maps.importLibrary('places');

  const $map = document.querySelector('#map');
  const $startAddress = document.querySelector('#startAddress');
  const $endAddress = document.querySelector('#endAddress');
  const $startTime = document.querySelector('#startTime');

  map = new Map($map, {
    center: { lat: -19.9167, lng: -43.9333 }, // Belo Horizonte
    zoom: 12,
  });

  // Initialize Directions Service and Renderer
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    map: map,
    suppressMarkers: true, // We'll use our own markers
  });

  const autocompleteOptions = {
    componentRestrictions: { country: 'br' },
    fields: [
      'address_components',
      'geometry',
      'icon',
      'name',
      'formatted_address',
    ],
  };

  autocompleteOrigin = new Autocomplete($startAddress, autocompleteOptions);
  autocompleteDest = new Autocomplete($endAddress, autocompleteOptions);

  // Prevent form submission on address selection
  $startAddress.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  });

  $endAddress.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  });

  // Check if we're editing an existing route
  const $form = document.querySelector('#destination-form');
  if ($form.dataset.editing) {
    const startLat = parseFloat($form.startLat.value);
    const startLng = parseFloat($form.startLng.value);
    const endLat = parseFloat($form.endLat.value);
    const endLng = parseFloat($form.endLng.value);

    if (!isNaN(startLat) && !isNaN(startLng) && !isNaN(endLat) && !isNaN(endLng)) {
      const startLocation = new google.maps.LatLng(startLat, startLng);
      const endLocation = new google.maps.LatLng(endLat, endLng);

      startMarker = new google.maps.Marker({
        map,
        position: startLocation,
      });

      endMarker = new google.maps.Marker({
        map,
        position: endLocation,
      });

      // Calculate route
      calculateRoute();

      // Fit map to show both markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(startLocation);
      bounds.extend(endLocation);
      map.fitBounds(bounds);
    }
  }

  autocompleteOrigin.addListener('place_changed', () => {
    const place = autocompleteOrigin.getPlace();

    if (!place.geometry || !place.geometry.location) {
      alert(`Sem detalhes disponíveis para: '${place.name}'`);
      return;
    }

    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);
    }

    // Update hidden fields
    document.getElementById('startLat').value = place.geometry.location.lat();
    document.getElementById('startLng').value = place.geometry.location.lng();

    if (startMarker) {
      startMarker.setPosition(place.geometry.location);
    } else {
      startMarker = new google.maps.Marker({
        map,
        position: place.geometry.location,
      });
    }

    if (endMarker) {
      calculateRoute();
    }
  });

  autocompleteDest.addListener('place_changed', () => {
    const place = autocompleteDest.getPlace();

    if (!place.geometry || !place.geometry.location) {
      alert(`Sem detalhes disponíveis para: '${place.name}'`);
      return;
    }

    // Update hidden fields
    document.getElementById('endLat').value = place.geometry.location.lat();
    document.getElementById('endLng').value = place.geometry.location.lng();

    if (endMarker) {
      endMarker.setPosition(place.geometry.location);
    } else {
      endMarker = new google.maps.Marker({
        map,
        position: place.geometry.location,
      });
    }

    if (startMarker) {
      calculateRoute();
    }
  });

  $startTime.addEventListener('change', () => {
    if (startMarker && endMarker) {
      calculateRoute();
    }
  });
}

function getNextDepartureTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const now = new Date();
  const departureTime = new Date(now);
  departureTime.setHours(hours, minutes, 0, 0);

  // If the time is in the past, use tomorrow's date
  if (departureTime < now) {
    departureTime.setDate(departureTime.getDate() + 1);
  }

  return departureTime;
}

function calculateRoute() {
  const departureTimeStr = document.querySelector('#startTime').value;
  if (!departureTimeStr) return;

  const departureTime = getNextDepartureTime(departureTimeStr);

  const request = {
    origin: startMarker.getPosition(),
    destination: endMarker.getPosition(),
    travelMode: google.maps.TravelMode.DRIVING,
    drivingOptions: {
      departureTime: departureTime,
      trafficModel: google.maps.TrafficModel.BEST_GUESS,
    },
  };

  directionsService.route(request, (result, status) => {
    if (status === google.maps.DirectionsStatus.OK) {
      directionsRenderer.setDirections(result);

      const route = result.routes[0].legs[0];
      const duration = route.duration.text;
      const arrivalTime = new Date(
        departureTime.getTime() + route.duration.value * 1000
      );

      // Update route info if elements exist
      const $estimatedTime = document.querySelector('#estimated-time');
      const $arrivalTime = document.querySelector('#arrival-time');
      const $routeInfo = document.querySelector('#route-info');

      if ($estimatedTime) $estimatedTime.textContent = duration;
      if ($arrivalTime)
        $arrivalTime.textContent = arrivalTime.toLocaleTimeString();
      if ($routeInfo) $routeInfo.style.display = 'block';

      const bounds = new google.maps.LatLngBounds();
      result.routes[0].legs.forEach((leg) => {
        bounds.extend(leg.start_location);
        bounds.extend(leg.end_location);
      });
      map.fitBounds(bounds);
    } else {
      alert('Não foi possível calcular a rota: ' + status);
    }
  });
}

// Inicializar mapa ao abrir o modal
const destinationModal = document.getElementById('destinationModal');
destinationModal.addEventListener('shown.bs.modal', () => {
  setTimeout(() => {
    if (!map) initMap();
  }, 300);
});

// Limpar campos quando o modal for fechado
destinationModal.addEventListener('hidden.bs.modal', () => {
  const $form = document.querySelector('#destination-form');
  $form.reset();
  $form.dataset.editing = '';

  // Limpar marcadores e rota
  if (startMarker) {
    startMarker.setMap(null);
    startMarker = null;
  }
  if (endMarker) {
    endMarker.setMap(null);
    endMarker = null;
  }
  if (directionsRenderer) {
    directionsRenderer.setDirections({ routes: [] });
  }

  // Resetar campos ocultos
  document.getElementById('startLat').value = '';
  document.getElementById('startLng').value = '';
  document.getElementById('endLat').value = '';
  document.getElementById('endLng').value = '';

  // Resetar informações da rota
  const $estimatedTime = document.querySelector('#estimated-time');
  const $arrivalTime = document.querySelector('#arrival-time');
  const $routeInfo = document.querySelector('#route-info');

  if ($estimatedTime) $estimatedTime.textContent = '';
  if ($arrivalTime) $arrivalTime.textContent = '';
  if ($routeInfo) $routeInfo.style.display = 'none';
});

setupDestinationsForm();
loadDestinations();

// Função global para abrir o modal de novo destino
window.openNewDestinationModal = function() {
  const modal = new bootstrap.Modal(document.getElementById('destinationModal'));
  modal.show();
  
  // Initialize map if not already initialized
  if (!map) {
    initMap();
  }
};
