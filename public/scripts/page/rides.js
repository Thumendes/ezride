import { destinationsRepository } from '../repositories/destinations.js';
import { rideRequestsRepository } from '../repositories/rideRequests.js';
import { usersRepository } from '../repositories/users.js';
import { getLoggedUser, isDriver, isPassenger } from '../utils.js';
import { ridesRepository } from '../repositories/rides.js';
import { vehiclesRepository } from '../repositories/vehicles.js';
import { calculateHaversineDistance } from '../utils.js';

const user = getLoggedUser();
const ridesList = document.getElementById('rides-list');
const emptyState = document.getElementById('empty-state');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const emptyTitle = document.getElementById('empty-title');
const emptySubtitle = document.getElementById('empty-subtitle');
const rideCreateContainer = document.getElementById('ride-create-container');
const btnOpenCreateRide = document.getElementById('btn-open-create-ride');
const createRideModal = new bootstrap.Modal(document.getElementById('createRideModal'));
const createRideForm = document.getElementById('createRideForm');
const rideVehicleSelect = document.getElementById('rideVehicle');
const rideSeatsInput = document.getElementById('rideSeats');

let rideMap, rideStartMarker, rideEndMarker, rideDirectionsService, rideDirectionsRenderer, rideAutocompleteOrigin, rideAutocompleteDest;

async function initRideMap() {
    if (rideMap) return;
    const { Map } = await google.maps.importLibrary('maps');
    const { Autocomplete } = await google.maps.importLibrary('places');
    rideMap = new Map(document.getElementById('rideMap'), {
        center: { lat: -19.9167, lng: -43.9333 },
        zoom: 12,
    });
    rideDirectionsService = new google.maps.DirectionsService();
    rideDirectionsRenderer = new google.maps.DirectionsRenderer({
        map: rideMap,
        suppressMarkers: true,
    });
    rideAutocompleteOrigin = new Autocomplete(document.getElementById('rideStartAddress'), {
        componentRestrictions: { country: 'br' },
        fields: ['geometry', 'name', 'formatted_address'],
    });
    rideAutocompleteDest = new Autocomplete(document.getElementById('rideEndAddress'), {
        componentRestrictions: { country: 'br' },
        fields: ['geometry', 'name', 'formatted_address'],
    });
    rideAutocompleteOrigin.addListener('place_changed', () => {
        const place = rideAutocompleteOrigin.getPlace();
        if (!place.geometry || !place.geometry.location) return;
        document.getElementById('rideStartLat').value = place.geometry.location.lat();
        document.getElementById('rideStartLng').value = place.geometry.location.lng();
        if (rideStartMarker) {
            rideStartMarker.setPosition(place.geometry.location);
        } else {
            rideStartMarker = new google.maps.Marker({ map: rideMap, position: place.geometry.location });
        }
        if (rideEndMarker) calculateRideRoute();
        rideMap.setCenter(place.geometry.location);
    });
    rideAutocompleteDest.addListener('place_changed', () => {
        const place = rideAutocompleteDest.getPlace();
        if (!place.geometry || !place.geometry.location) return;
        document.getElementById('rideEndLat').value = place.geometry.location.lat();
        document.getElementById('rideEndLng').value = place.geometry.location.lng();
        if (rideEndMarker) {
            rideEndMarker.setPosition(place.geometry.location);
        } else {
            rideEndMarker = new google.maps.Marker({ map: rideMap, position: place.geometry.location });
        }
        if (rideStartMarker) calculateRideRoute();
        rideMap.setCenter(place.geometry.location);
    });
}

function calculateRideRoute() {
    if (!rideStartMarker || !rideEndMarker) return;
    rideDirectionsService.route({
        origin: rideStartMarker.getPosition(),
        destination: rideEndMarker.getPosition(),
        travelMode: google.maps.TravelMode.DRIVING,
    }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            rideDirectionsRenderer.setDirections(result);
        }
    });
}

async function loadDriverVehicles() {
    if (!user) return;
    const vehicles = await vehiclesRepository.getByDriverId(user.id);
    rideVehicleSelect.innerHTML = '<option value="">Selecione um veículo</option>';
    vehicles.forEach(vehicle => {
        rideVehicleSelect.innerHTML += `<option value="${vehicle.id}" data-seats="${vehicle.availableSeats}">${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})</option>`;
    });
}

rideVehicleSelect.addEventListener('change', function () {
    const selected = rideVehicleSelect.options[rideVehicleSelect.selectedIndex];
    const seats = selected.getAttribute('data-seats');
    if (seats) {
        rideSeatsInput.value = seats;
        rideSeatsInput.disabled = true;
    } else {
        rideSeatsInput.value = '';
        rideSeatsInput.disabled = false;
    }
});

document.getElementById('createRideModal').addEventListener('shown.bs.modal', async () => {
    setTimeout(async () => {
        if (!rideMap) await initRideMap();
        await loadDriverVehicles();
    }, 300);
});
document.getElementById('createRideModal').addEventListener('hidden.bs.modal', () => {
    rideMap = null;
    rideStartMarker = null;
    rideEndMarker = null;
    rideDirectionsService = null;
    rideDirectionsRenderer = null;
});

if (isDriver()) {
    pageTitle.textContent = 'Solicitações de Carona';
    pageSubtitle.textContent = 'Veja e aceite solicitações de passageiros';
    emptyTitle.textContent = 'Nenhuma solicitação disponível';
    emptySubtitle.textContent = 'Aguarde por novas solicitações de carona!';
    rideCreateContainer.style.display = 'block';
    btnOpenCreateRide.addEventListener('click', () => createRideModal.show());
    createRideForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ride = {
            driverId: user.id,
            vehicleId: document.getElementById('rideVehicle').value,
            startAddress: document.getElementById('rideStartAddress').value,
            startLat: parseFloat(document.getElementById('rideStartLat').value),
            startLng: parseFloat(document.getElementById('rideStartLng').value),
            endAddress: document.getElementById('rideEndAddress').value,
            endLat: parseFloat(document.getElementById('rideEndLat').value),
            endLng: parseFloat(document.getElementById('rideEndLng').value),
            startTime: document.getElementById('rideStartTime').value,
            availableSeats: parseInt(document.getElementById('rideSeats').value, 10),
            status: 'AVAILABLE',
        };
        try {
            if (createRideForm.dataset.editing) {
                await ridesRepository.updateRide(createRideForm.dataset.editing, ride);
                createRideForm.dataset.editing = '';
                Swal.fire('Sucesso', 'Carona atualizada com sucesso!', 'success');
            } else {
                await ridesRepository.createRide(ride);
                Swal.fire('Sucesso', 'Carona criada com sucesso!', 'success');
            }
            createRideModal.hide();
            loadRides();
        } catch (err) {
            Swal.fire('Erro', 'Erro ao salvar carona', 'error');
        }
    });
} else if (isPassenger()) {
    pageTitle.textContent = 'Minhas Solicitações';
    pageSubtitle.textContent = 'Acompanhe o status das suas solicitações de carona';
    emptyTitle.textContent = 'Nenhuma solicitação encontrada';
    emptySubtitle.textContent = 'Cadastre um destino para solicitar carona!';
}



window.aceitarSolicitacao = async function (requestId) {
    try {
        const req = (await rideRequestsRepository.getRideRequests()).find(r => r.id === requestId);
        if (!req) {
            Swal.fire('Erro', 'Solicitação não encontrada.', 'error');
            return;
        }
        await fetch(`${window.location.origin}/ride-requests/${requestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ACCEPTED' })
        });
        Swal.fire('Sucesso', 'Solicitação aceita!', 'success');
        await loadRides();
    } catch {
        Swal.fire('Erro', 'Erro ao aceitar solicitação.', 'error');
    }
};

window.recusarSolicitacao = async function (requestId) {
    try {
        const req = (await rideRequestsRepository.getRideRequests()).find(r => r.id === requestId);
        if (!req) {
            Swal.fire('Erro', 'Solicitação não encontrada.', 'error');
            return;
        }
        await fetch(`${window.location.origin}/ride-requests/${requestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'REJECTED' })
        });
        Swal.fire('Solicitação recusada', 'Você recusou esta solicitação.', 'info');
        await loadRides();
    } catch {
        Swal.fire('Erro', 'Erro ao recusar solicitação.', 'error');
    }
};

window.verDetalhesSolicitacao = async function (destinationId) {
    const allUsers = window.allUsers || await usersRepository.list();
    const destination = (await destinationsRepository.getDestinations()).find(d => d.id === destinationId);
    const passageiro = allUsers.find(u => u.id === destination.userId);
    const motorista = allUsers.find(u => u.id === user.id);

    let vehicleInfo = '';
    if (isDriver()) {
        try {
            const vehicles = await vehiclesRepository.getByDriverId(user.id);
            if (vehicles.length > 0) {
                const vehicle = vehicles[0];
                vehicleInfo = `<span class='d-block mb-1'><i class='bi bi-car-front text-primary'></i> <strong>Veículo:</strong> ${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})</span>`;
            }
        } catch (error) {
            console.error('Erro ao buscar veículo:', error);
        }
    }

    let infoHtml = `<div class='mb-3'>
        <span class='d-block mb-1'><i class='bi bi-person-circle text-primary'></i> <strong>Passageiro:</strong> ${passageiro ? passageiro.name : 'Desconhecido'}</span>
        <span class='d-block mb-1'><i class='bi bi-envelope text-primary'></i> <strong>Email:</strong> ${passageiro ? passageiro.email : 'N/A'}</span>
        ${vehicleInfo}
        <span class='d-block mb-1'><i class='bi bi-geo-alt text-primary'></i> <strong>Origem:</strong> ${destination.startAddress}</span>
        <span class='d-block mb-1'><i class='bi bi-geo-alt-fill text-primary'></i> <strong>Destino:</strong> ${destination.endAddress}</span>
        <span class='d-block mb-1'><i class='bi bi-clock text-primary'></i> <strong>Horário:</strong> ${destination.startTime}</span>
      </div>`;
    document.getElementById('detalhes-info').innerHTML = infoHtml;

    setTimeout(() => {
        const map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: destination.startLat, lng: destination.startLng },
            zoom: 13
        });
        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer({ map });
        const origin = { lat: destination.startLat, lng: destination.startLng };
        const destinationLatLng = { lat: destination.endLat, lng: destination.endLng };
        const waypoints = [];
        directionsService.route({
            origin,
            destination: destinationLatLng,
            waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: true
        }, (result, status) => {
            if (status === 'OK') {
                directionsRenderer.setDirections(result);
            } else {
                new google.maps.Marker({ position: origin, map, label: 'P', title: 'Origem do Passageiro' });
                new google.maps.Marker({ position: destinationLatLng, map, label: 'D', title: 'Destino do Passageiro' });
            }
        });
    }, 300);

    const detalhesModal = new bootstrap.Modal(document.getElementById('detalhesModal'));
    detalhesModal.show();
};

/**
 * Filtra as corridas para começar em um raio de 5km do destino do passageiro logado.
 * @param {Array} rides - Array de corridas.
 * @param {Array} destinations - Array de destinos.
 * @returns {Array} Array de corridas filtradas.
 */
function filterPassengerRides(rides, destinations) {
    // Filtra as corridas para que o destino comece em um raio de 5km do destino do passageiro logado.
    rides = rides.filter(ride => {
        return destinations.some(destination => {
            const distance = calculateHaversineDistance(
                ride.startLat,
                ride.startLng,
                destination.startLat,
                destination.startLng
            );
            return distance <= 5;
        });
    });

    // Filtra as corridas para que o horário esteja dentro de uma tolerância de 15 minutos
    rides = rides.filter(ride => {
        return destinations.some(destination => {
            // Converte os horários para minutos desde meia-noite para facilitar comparação
            const [rideHour, rideMinute] = ride.startTime.split(':').map(Number);
            const [destHour, destMinute] = destination.startTime.split(':').map(Number); 
            
            const rideMinutes = rideHour * 60 + rideMinute;
            const destMinutes = destHour * 60 + destMinute;
            
            // Verifica se está dentro da tolerância de 15 minutos
            const timeDiff = Math.abs(rideMinutes - destMinutes);
            return timeDiff <= 15;
        });
    });

    return rides;
}

async function loadRides() {
    let rides = [];
    try {
        rides = await ridesRepository.getRides();
        window.rideRequestsCache = await rideRequestsRepository.getRideRequests();
    } catch {
        ridesList.innerHTML = '<div class="alert alert-danger">Erro ao carregar caronas.</div>';
        return;
    }
    if (!rides.length) {
        ridesList.innerHTML = '<div class="alert alert-info">Nenhuma carona disponível.</div>';
        return;
    }

    if (isPassenger()) {
        const destinations = await destinationsRepository.getDestinationsByUser(user.id);
        rides = filterPassengerRides(rides, destinations);
    }

    const driverIds = [...new Set(rides.map(ride => ride.driverId))];
    const vehicleIds = [...new Set(rides.map(ride => ride.vehicleId))];
    
    const [allUsers, allVehicles] = await Promise.all([
        usersRepository.list(),
        Promise.all(vehicleIds.map(id => vehiclesRepository.getVehicleById(id).catch(() => null)))
    ]);

    const usersMap = new Map(allUsers.map(user => [user.id, user]));
    const vehiclesMap = new Map(allVehicles.filter(v => v).map(vehicle => [vehicle.id, vehicle]));

    ridesList.innerHTML = '';
    if (isDriver()) {
        const myRides = rides.filter(ride => ride.driverId === user.id);
        if (myRides.length) {
            ridesList.innerHTML += '<h5 class="mb-3 mt-2">Minhas Caronas</h5>';
            for (const ride of myRides) {
                ridesList.innerHTML += await renderRideCard(ride, true, usersMap, vehiclesMap);
            }
        } else {
            ridesList.innerHTML += '<div class="alert alert-info">Você ainda não criou nenhuma carona.</div>';
        }
        const otherRides = rides.filter(ride => ride.driverId !== user.id);
        if (otherRides.length) {
            ridesList.innerHTML += '<h5 class="mb-3 mt-4">Outras Caronas Disponíveis</h5>';
            for (const ride of otherRides) {
                ridesList.innerHTML += await renderRideCard(ride, false, usersMap, vehiclesMap);
            }
        }
    } else {
        for (const ride of rides) {
            ridesList.innerHTML += await renderRideCard(ride, false, usersMap, vehiclesMap);
        }
    }
}

async function renderRideCard(ride, isMine = false, usersMap = null, vehiclesMap = null) {
    let driver = null;
    let vehicle = null;
    
    if (!usersMap || !vehiclesMap) {
        const [allUsers, vehicleData] = await Promise.all([
            usersRepository.list(),
            vehiclesRepository.getVehicleById(ride.vehicleId).catch(() => null)
        ]);
        driver = allUsers.find(u => u.id === ride.driverId);
        vehicle = vehicleData;
    } else {
        driver = usersMap.get(ride.driverId);
        vehicle = vehiclesMap.get(ride.vehicleId);
    }

    let actions = '';

    let rideRequest = null;

    if (isPassenger()) {
        rideRequest = window.rideRequestsCache.find(req => req.rideId === ride.id && req.userId === user.id);
        
        if (rideRequest) {
            switch (rideRequest.status) {
                case 'REJECTED':
                    actions = `<span class='badge bg-danger text-white rounded-pill px-3 py-2'><i class="bi bi-x-circle me-1"></i>Solicitação recusada</span>`;
                    break;
                case 'ACCEPTED':
                    actions = `<span class='badge bg-success text-white rounded-pill px-3 py-2'><i class="bi bi-check-circle me-1"></i>Solicitação aceita</span>`;
                    break;
                case 'PENDING':
                    actions = `<span class='badge bg-warning text-dark rounded-pill px-3 py-2'><i class="bi bi-clock me-1"></i>Solicitação enviada</span>`;
                    break;       
                case 'COMPLETED':
                    actions = `<span class='badge bg-success text-white rounded-pill px-3 py-2'><i class="bi bi-check-circle me-1"></i>Carona finalizada</span>`;
                    break;
                case 'IN PROGRESS':
                    actions = `<span class='badge bg-primary text-white rounded-pill px-3 py-2'><i class="bi bi-play-circle me-1"></i>Carona em andamento</span>`;
                    break;
                case 'CANCELLED':
                    actions = `<span class='badge bg-danger text-white rounded-pill px-3 py-2'><i class="bi bi-x-circle me-1"></i>Carona cancelada</span>`;
                    break;
            }
        } else {
            actions = `
            <button class="btn btn-outline-primary rounded-pill px-3" onclick="window.verRotaCarona('${ride.id}')">
              <i class="bi bi-map me-1"></i>Ver rota
            </button>
            <button class="btn btn-success rounded-pill px-3" onclick="window.solicitarCarona('${ride.id}')">
              <i class="bi bi-plus-circle me-1"></i>Solicitar Carona
            </button>
          `;
        }
    } else if (isDriver() && ride.driverId === user.id) {
        actions = `
          <span class="badge bg-info rounded-pill px-3 py-2 me-2">
            <i class="bi bi-star me-1"></i>Criada por você
          </span>
          <button class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="window.editarCarona('${ride.id}')">
            <i class="bi bi-pencil me-1"></i>Editar
          </button>
          <button class="btn btn-outline-danger btn-sm rounded-pill px-3" onclick="window.excluirCarona('${ride.id}')">
            <i class="bi bi-trash me-1"></i>Excluir
          </button>
        `;
    }

    const driverName = driver ? driver.name : 'Motorista não encontrado';
    const vehicleInfo = vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})` : 'Veículo não encontrado';

    return `
        <div class="modern-card p-4 mb-3 ${isMine ? 'border border-primary shadow-lg' : 'shadow'} rounded-3" style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); border-left: 4px solid ${isMine ? '#0d6efd' : '#28a745'};">
          <div class="d-flex justify-content-between align-items-start mb-3">
            <div class="flex-grow-1">
              <h5 class="fw-bold mb-2 text-primary">
                <i class="bi bi-geo-alt-fill me-2"></i>
                ${ride.startAddress} 
                <i class="bi bi-arrow-right mx-2 text-muted"></i>
                ${ride.endAddress}
              </h5>
            </div>
          </div>
          
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <div class="d-flex align-items-center text-muted">
                <i class="bi bi-person-circle text-primary me-2 fs-5"></i>
                <div>
                  <small class="text-muted d-block">Motorista</small>
                  <strong class="text-dark">${driverName}</strong>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="d-flex align-items-center text-muted">
                <i class="bi bi-car-front text-primary me-2 fs-5"></i>
                <div>
                  <small class="text-muted d-block">Veículo</small>
                  <strong class="text-dark">${vehicleInfo}</strong>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="d-flex align-items-center text-muted">
                <i class="bi bi-clock text-primary me-2 fs-5"></i>
                <div>
                  <small class="text-muted d-block">Horário</small>
                  <strong class="text-dark">${ride.startTime}</strong>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="d-flex align-items-center text-muted">
                <i class="bi bi-people text-primary me-2 fs-5"></i>
                <div>
                  <small class="text-muted d-block">Vagas</small>
                  <strong class="text-dark">${ride.availableSeats} disponível(is)</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="d-flex gap-2 flex-wrap">
            ${actions}
          </div>
        </div>
      `;
}

window.solicitarCarona = async function (rideId) {
    try {
        const ride = await ridesRepository.getRideById(rideId);
        if (!ride) {
            Swal.fire('Erro', 'Carona não encontrada.', 'error');
            return;
        }

        const allRequests = await rideRequestsRepository.getRideRequests();
        const existing = allRequests.find(req => req.rideId === rideId && req.userId === user.id && req.status === 'PENDING');
        if (existing) {
            Swal.fire('Atenção', 'Você já solicitou esta carona. Aguarde o motorista responder.', 'info');
            return;
        }

        // Buscar os destinos do usuário
        const userDestinations = await destinationsRepository.getDestinationsByUser(user.id);
        
        if (userDestinations.length === 0) {
            Swal.fire('Erro', 'Você não possui nenhum destino cadastrado. Cadastre um destino antes de solicitar uma carona.', 'error');
            return;
        }

        let destinationId;

        // Se houver apenas um destino, usa ele diretamente
        if (userDestinations.length === 1) {
            destinationId = userDestinations[0].id;
        } else {
            // Se houver múltiplos destinos, mostra modal para seleção
            const result = await Swal.fire({
                title: 'Selecione o destino',
                html: `
                    <select id="swal-select-destination" class="form-select">
                        ${userDestinations.map(dest => `
                            <option value="${dest.id}">
                                ${dest.name} - ${dest.startTime} - ${dest.startAddress}
                            </option>
                        `).join('')}
                    </select>
                `,
                showCancelButton: true,
                confirmButtonText: 'Confirmar',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    return document.getElementById('swal-select-destination').value;
                }
            });

            destinationId = result.value;
        }

        if (destinationId) {
            const newRequest = {
                id: Date.now().toString(),
                rideId: rideId,
                userId: user.id,
                driverId: ride.driverId,
                destinationId: destinationId,
                status: 'PENDING',
                createdAt: new Date().toISOString()
            };

            await fetch(`${window.location.origin}/ride-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRequest)
            });

            Swal.fire('Solicitação enviada!', 'Aguarde o motorista aceitar.', 'success');
        }
    } catch (error) {
        console.error('Erro ao solicitar carona:', error);
        Swal.fire('Erro', 'Erro ao solicitar carona.', 'error');
    }
};

window.excluirCarona = async function (rideId) {
    if (!confirm('Tem certeza que deseja excluir esta carona?')) return;
    try {
        await ridesRepository.deleteRide(rideId);
        Swal.fire('Excluída!', 'A carona foi excluída.', 'success');
        loadRides();
    } catch {
        Swal.fire('Erro', 'Erro ao excluir carona.', 'error');
    }
};

window.editarCarona = async function (rideId) {
    try {
        const ride = await ridesRepository.getRideById(rideId);
        document.getElementById('rideStartAddress').value = ride.startAddress;
        document.getElementById('rideStartLat').value = ride.startLat;
        document.getElementById('rideStartLng').value = ride.startLng;
        document.getElementById('rideEndAddress').value = ride.endAddress;
        document.getElementById('rideEndLat').value = ride.endLat;
        document.getElementById('rideEndLng').value = ride.endLng;
        document.getElementById('rideStartTime').value = ride.startTime;
        document.getElementById('rideVehicle').value = ride.vehicleId;
        document.getElementById('rideSeats').value = ride.availableSeats;
        document.getElementById('rideSeats').disabled = true;
        createRideForm.dataset.editing = rideId;
        createRideModal.show();
    } catch {
        Swal.fire('Erro', 'Erro ao carregar dados da carona.', 'error');
    }
};

const modalRotaHtml = `
      <div class="modal fade" id="modalRotaCarona" tabindex="-1" aria-labelledby="modalRotaCaronaLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="modalRotaCaronaLabel">Detalhes da Rota</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
            </div>
            <div class="modal-body">
              <div id="rotaCaronaInfo"></div>
              <div id="rotaCaronaMap" style="height: 300px; border-radius: 10px; margin: 1rem 0;"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-success" id="btnAceitarRota">Aceitar</button>
              <button type="button" class="btn btn-danger" id="btnRecusarRota">Recusar</button>
            </div>
          </div>
        </div>
      </div>
    `;
if (!document.getElementById('modalRotaCarona')) {
    document.body.insertAdjacentHTML('beforeend', modalRotaHtml);
}

window.verRotaCarona = async function (rideId) {
    const ride = await ridesRepository.getRideById(rideId);
    const [motorista, vehicle] = await Promise.all([
        usersRepository.list().then(users => users.find(u => u.id === ride.driverId)),
        vehiclesRepository.getVehicleById(ride.vehicleId).catch(() => null)
    ]);
    
    const driverName = motorista ? motorista.name : 'Motorista não encontrado';
    const vehicleInfo = vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})` : 'Veículo não encontrado';
    
    let infoHtml = `
        <div><strong>Motorista:</strong> ${driverName}<br>
        <strong>Email:</strong> ${motorista ? motorista.email : 'N/A'}</div>
        <div><strong>Veículo:</strong> ${vehicleInfo}</div>
        <div><strong>Origem:</strong> ${ride.startAddress}</div>
        <div><strong>Destino:</strong> ${ride.endAddress}</div>
        <div><strong>Horário:</strong> ${ride.startTime}</div>
        <div><strong>Vagas disponíveis:</strong> ${ride.availableSeats}</div>
      `;
    document.getElementById('rotaCaronaInfo').innerHTML = infoHtml;
    setTimeout(async () => {
        const { Map } = await google.maps.importLibrary('maps');
        const { DirectionsService, DirectionsRenderer } = await google.maps.importLibrary('routes');
        const map = new Map(document.getElementById('rotaCaronaMap'), {
            center: { lat: ride.startLat, lng: ride.startLng },
            zoom: 13
        });
        const directionsService = new DirectionsService();
        const directionsRenderer = new DirectionsRenderer({ map });
        directionsService.route({
            origin: { lat: ride.startLat, lng: ride.startLng },
            destination: { lat: ride.endLat, lng: ride.endLng },
            travelMode: google.maps.TravelMode.DRIVING
        }, (result, status) => {
            if (status === 'OK') {
                directionsRenderer.setDirections(result);
            } else {
                new google.maps.Marker({ position: { lat: ride.startLat, lng: ride.startLng }, map, label: 'A', title: 'Origem' });
                new google.maps.Marker({ position: { lat: ride.endLat, lng: ride.endLng }, map, label: 'B', title: 'Destino' });
            }
        });
    }, 300);
    const modal = new bootstrap.Modal(document.getElementById('modalRotaCarona'));
    modal.show();
    document.getElementById('btnAceitarRota').onclick = async () => {
        await window.solicitarCarona(rideId);
        modal.hide();
    };
    document.getElementById('btnRecusarRota').onclick = () => {
        modal.hide();
    };
};

document.addEventListener('DOMContentLoaded', function () {
    if (typeof addLogoutButton === 'function') addLogoutButton();
    loadRides();
});