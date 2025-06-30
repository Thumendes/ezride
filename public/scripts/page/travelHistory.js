import { rideRequestsRepository } from '../repositories/rideRequests.js';
import { ridesRepository } from '../repositories/rides.js';
import { usersRepository } from '../repositories/users.js';
import { vehiclesRepository } from '../repositories/vehicles.js';
import { getLoggedUser, isDriver } from '../utils.js';

let travelHistory = [];

function calculateExpectedTime(startLat, startLng, endLat, endLng) {
    if (!startLat || !startLng || !endLat || !endLng) {
        return 'Tempo não calculável';
    }

    const R = 6371; 
    const dLat = (endLat - startLat) * Math.PI / 180;
    const dLng = (endLng - startLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(startLat * Math.PI / 180) * Math.cos(endLat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; 

    const avgSpeed = 30;
    const timeInHours = distance / avgSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);

    if (timeInMinutes < 60) {
        return `${timeInMinutes} min`;
    } else {
        const hours = Math.floor(timeInMinutes / 60);
        const minutes = timeInMinutes % 60;
        return `${hours}h ${minutes}min`;
    }
}

function calculateDistance(startLat, startLng, endLat, endLng) {
    if (!startLat || !startLng || !endLat || !endLng) {
        return 0;
    }

    const R = 6371; 
    const dLat = (endLat - startLat) * Math.PI / 180;
    const dLng = (endLng - startLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(startLat * Math.PI / 180) * Math.cos(endLat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function loadTravelHistory() {
    try {
        const currentUser = getLoggedUser();
        if (!currentUser) {
            window.location.href = '../login.html';
            return;
        }

        // Atualizar título da página baseado no tipo de usuário
        updatePageTitle();

        const requests = await rideRequestsRepository.getRideRequests();
        let userRequests;
        
        if (isDriver()) {
            // Para motoristas, mostrar corridas onde eles são o motorista
            const allRides = await Promise.all(
                requests.map(async (request) => {
                    try {
                        const ride = await ridesRepository.getRideById(request.rideId);
                        return { ...request, ride };
                    } catch (error) {
                        return null;
                    }
                })
            );
            
            userRequests = allRides.filter(item => 
                item && item.ride && item.ride.driverId === currentUser.id
            );
        } else {
            // Para passageiros, mostrar suas solicitações
            userRequests = requests.filter(request => request.userId === currentUser.id);
        }
        
        const enrichedRequests = await Promise.all(
            userRequests.map(async (request) => {
                try {
                    const ride = request.ride || await ridesRepository.getRideById(request.rideId);
                    const driver = await usersRepository.list().then(users => users.find(u => u.id === ride.driverId));
                    const vehicle = await vehiclesRepository.getVehicleById(ride.vehicleId).catch(() => null);
                    
                    // Para motoristas, buscar informações do passageiro
                    let passenger = null;
                    if (isDriver()) {
                        passenger = await usersRepository.list().then(users => users.find(u => u.id === request.userId));
                    }
                    
                    return {
                        ...request,
                        ride: ride,
                        driver: driver,
                        vehicle: vehicle,
                        passenger: passenger
                    };
                } catch (error) {
                    console.error(`Error fetching ride ${request.rideId}:`, error);
                    return request;
                }
            })
        );
        
        travelHistory = enrichedRequests.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        updateStatistics();
        displayTravelHistory();
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        document.getElementById('travelHistoryList').innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Erro ao carregar histórico: ${error.message}
            </div>
        `;
    }
}

function updateStatistics() {
    const totalTrips = travelHistory.length;
    const completedTrips = travelHistory.filter(trip => trip.status === 'ACCEPTED' || trip.status === 'COMPLETED').length;
    
    let totalDistance = 0;
    let totalTime = 0;
    
    travelHistory.forEach(trip => {
        if (trip.ride) {
            const distance = calculateDistance(
                trip.ride.startLat, 
                trip.ride.startLng, 
                trip.ride.endLat, 
                trip.ride.endLng
            );
            totalDistance += distance;
            
            const time = calculateExpectedTime(
                trip.ride.startLat, 
                trip.ride.startLng, 
                trip.ride.endLat, 
                trip.ride.endLng
            );
            if (time !== 'Tempo não calculável') {
                const timeMatch = time.match(/(\d+)h\s*(\d+)?min/);
                if (timeMatch) {
                    totalTime += parseInt(timeMatch[1]) || 0;
                    if (timeMatch[2]) totalTime += parseInt(timeMatch[2]) / 60;
                }
            }
        }
    });

    document.getElementById('totalTrips').textContent = totalTrips;
    document.getElementById('totalDistance').textContent = `${totalDistance.toFixed(1)} km`;
    document.getElementById('totalTime').textContent = `${Math.round(totalTime)}h`;
    
    const totalSavings = (completedTrips * 15).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('totalSavings').textContent = totalSavings;
}

function displayTravelHistory() {
    const container = document.getElementById('travelHistoryList');
    container.innerHTML = '';

    if (travelHistory.length === 0) {
        const isUserDriver = isDriver();
        const message = isUserDriver ? 
            'Você ainda não possui corridas como motorista.' : 
            'Você ainda não possui viagens no seu histórico.';
        
        container.innerHTML = `
            <div class="empty-history">
                <i class="bi bi-clock-history"></i>
                <h5>Nenhuma viagem encontrada</h5>
                <p>${message}</p>
                <a href="../caronas/" class="btn btn-primary">
                    <i class="bi bi-search me-2"></i>Buscar Caronas
                </a>
            </div>
        `;
        return;
    }

    travelHistory.forEach((trip, index) => {
        const ride = trip.ride || {};
        const driver = trip.driver || {};
        const vehicle = trip.vehicle || {};
        const passenger = trip.passenger || {};
        
        const startAddress = ride.startAddress || 'Endereço de origem não informado';
        const endAddress = ride.endAddress || 'Endereço de destino não informado';
        const startTime = ride.startTime || 'Horário não informado';
        const tripDate = new Date(trip.createdAt || Date.now()).toLocaleDateString('pt-BR');
        const expectedTime = calculateExpectedTime(ride.startLat, ride.startLng, ride.endLat, ride.endLng);
        
        // Determinar informações baseadas no tipo de usuário
        const isUserDriver = isDriver();
        let userInfo = '';
        
        if (isUserDriver) {
            // Para motoristas, mostrar informações do passageiro
            const passengerName = passenger.name || 'Passageiro não encontrado';
            const passengerEmail = passenger.email || 'Email não informado';
            userInfo = `
                <div class="trip-info">
                    <i class="bi bi-person text-primary"></i>
                    <strong>Passageiro:</strong> ${passengerName}
                </div>
                <div class="trip-info">
                    <i class="bi bi-envelope text-info"></i>
                    <strong>Email:</strong> ${passengerEmail}
                </div>
            `;
        } else {
            // Para passageiros, mostrar informações do motorista
            const driverName = driver.name || 'Motorista não encontrado';
            const driverEmail = driver.email || 'Email não informado';
            const vehicleInfo = vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})` : 'Veículo não informado';
            
            userInfo = `
                <div class="trip-info">
                    <i class="bi bi-person text-primary"></i>
                    <strong>Motorista:</strong> ${driverName}
                </div>
                <div class="trip-info">
                    <i class="bi bi-envelope text-info"></i>
                    <strong>Email:</strong> ${driverEmail}
                </div>
                <div class="trip-info">
                    <i class="bi bi-car-front text-success"></i>
                    <strong>Veículo:</strong> ${vehicleInfo}
                </div>
            `;
        }
        
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">
                        <i class="bi bi-car-front me-2"></i>
                        Viagem #${trip.id.slice(-6)}
                    </h6>
                    <span class="status-badge ${getStatusBadgeClass(trip.status)}">
                        ${getStatusText(trip.status)}
                    </span>
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <div class="trip-info">
                            <i class="bi bi-geo-alt text-success"></i>
                            <strong>Origem:</strong> ${startAddress}
                        </div>
                        <div class="trip-info">
                            <i class="bi bi-geo-alt-fill text-danger"></i>
                            <strong>Destino:</strong> ${endAddress}
                        </div>
                        <div class="trip-info">
                            <i class="bi bi-clock text-primary"></i>
                            <strong>Horário:</strong> ${startTime}
                        </div>
                        <div class="trip-info">
                            <i class="bi bi-calendar text-info"></i>
                            <strong>Data:</strong> ${tripDate}
                        </div>
                        <div class="trip-info">
                            <i class="bi bi-stopwatch text-warning"></i>
                            <strong>Tempo estimado:</strong> ${expectedTime}
                        </div>
                    </div>
                    <div class="col-md-4">
                        ${userInfo}
                        <div class="mt-3">
                            <button class="btn btn-outline-primary btn-sm w-100" onclick="seeDetails(${index})">
                                <i class="bi bi-eye me-2"></i>Ver Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'ACCEPTED':
            return 'bg-success';
        case 'REJECTED':
            return 'bg-danger';
        case 'PENDING':
            return 'bg-warning';
        case 'IN_PROGRESS':
        case 'IN PROGRESS':
            return 'bg-primary';
        case 'COMPLETED':
            return 'bg-success';
        case 'CANCELLED':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'ACCEPTED':
            return 'Aceita';
        case 'REJECTED':
            return 'Recusada';
        case 'PENDING':
            return 'Pendente';
        case 'IN_PROGRESS':
        case 'IN PROGRESS':
            return 'Em Andamento';
        case 'COMPLETED':
            return 'Finalizada';
        case 'CANCELLED':
            return 'Cancelada';
        default:
            return status;
    }
}

function seeDetails(index) {
    const trip = travelHistory[index];
    if (!trip) return;

    const ride = trip.ride || {};
    const driver = trip.driver || {};
    const vehicle = trip.vehicle || {};
    const passenger = trip.passenger || {};
    
    const startAddress = ride.startAddress || 'Endereço de origem não especificado';
    const endAddress = ride.endAddress || 'Endereço de destino não especificado';
    const startTime = ride.startTime || 'Horário não informado';
    const tripDate = new Date(trip.createdAt || Date.now()).toLocaleDateString('pt-BR');
    const expectedTime = calculateExpectedTime(ride.startLat, ride.startLng, ride.endLat, ride.endLng);

    // Determinar informações baseadas no tipo de usuário
    const isUserDriver = isDriver();
    let userSection = '';
    
    if (isUserDriver) {
        // Para motoristas, mostrar informações do passageiro
        const passengerName = passenger.name || 'Passageiro não encontrado';
        const passengerEmail = passenger.email || 'Email não informado';
        userSection = `
            <h6 class="text-primary mb-3"><i class="bi bi-person me-2"></i>Passageiro</h6>
            <div class="mb-3">
                <strong>Nome:</strong> ${passengerName}<br>
                <strong>Email:</strong> ${passengerEmail}
            </div>
        `;
    } else {
        // Para passageiros, mostrar informações do motorista
        const driverName = driver.name || 'Motorista não encontrado';
        const driverEmail = driver.email || 'Email não informado';
        const vehicleInfo = vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})` : 'Veículo não informado';
        
        userSection = `
            <h6 class="text-primary mb-3"><i class="bi bi-person me-2"></i>Motorista</h6>
            <div class="mb-3">
                <strong>Nome:</strong> ${driverName}<br>
                <strong>Email:</strong> ${driverEmail}
            </div>
            <h6 class="text-primary mb-3"><i class="bi bi-car-front me-2"></i>Veículo</h6>
            <div class="mb-3">
                <strong>Modelo:</strong> ${vehicleInfo}
            </div>
        `;
    }

    // Criar modal dinamicamente se não existir
    let modal = document.getElementById('tripDetailsModal');
    if (!modal) {
        const modalHtml = `
            <div class="modal fade" id="tripDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <h5 class="modal-title">
                                <i class="bi bi-car-front me-2"></i>
                                Detalhes da Viagem
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6 class="text-primary mb-3"><i class="bi bi-geo-alt me-2"></i>Rota</h6>
                                    <div class="mb-3">
                                        <strong>Origem:</strong><br>
                                        <span class="text-muted">${startAddress}</span>
                                    </div>
                                    <div class="mb-3">
                                        <strong>Destino:</strong><br>
                                        <span class="text-muted">${endAddress}</span>
                                    </div>
                                    <div class="mb-3">
                                        <strong>Data:</strong> ${tripDate}<br>
                                        <strong>Horário:</strong> ${startTime}<br>
                                        <strong>Tempo estimado:</strong> ${expectedTime}
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    ${userSection}
                                    <h6 class="text-primary mb-3"><i class="bi bi-info-circle me-2"></i>Status</h6>
                                    <div class="mb-3">
                                        <span class="badge ${getStatusBadgeClass(trip.status)} px-3 py-2">
                                            ${getStatusText(trip.status)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modal = document.getElementById('tripDetailsModal');
    }

    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// Função global para ser chamada pelo onclick
window.seeDetails = seeDetails;

// Carregar histórico quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    loadTravelHistory();
    
    // Adicionar listener para o botão de atualizar
    const refreshButton = document.querySelector('button[onclick="location.reload()"]');
    if (refreshButton) {
        refreshButton.onclick = function(e) {
            e.preventDefault();
            loadTravelHistory();
        };
    }
});

function updatePageTitle() {
    const titleElement = document.querySelector('h2');
    if (titleElement) {
        const isUserDriver = isDriver();
        const title = isUserDriver ? 'Histórico de Corridas como Motorista' : 'Histórico de Viagens';
        titleElement.innerHTML = `<i class="bi bi-clock-history text-primary"></i> ${title}`;
    }
} 