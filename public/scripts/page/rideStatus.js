import { rideRequestsRepository } from '../repositories/rideRequests.js';
import { usersRepository } from '../repositories/users.js';
import { ridesRepository } from '../repositories/rides.js';
import { getLoggedUser, requireDriver } from '../utils.js';
import { Config } from '../config.js';
import { destinationsRepository } from '../repositories/destinations.js';

requireDriver();

let rideRequests = [];
const currentDriver = getLoggedUser();

if (!currentDriver) {
    window.location.href = `${Config.BASE_URL}/login.html`;
}

async function loadRideRequests() {
    try {
        const allRequests = await rideRequestsRepository.getRideRequestsByDriver(currentDriver.id);
        const allUsers = await usersRepository.list();
        rideRequests = [];
        for (let request of allRequests) {
            let destination = null;
            try {
                destination = await destinationsRepository.getDestinationById(request.destinationId);
            } catch (err) {
                continue;
            }
            const passenger = destination ? allUsers.find(u => u.id === destination.userId) : null;
            rideRequests.push({
                ...request,
                destination,
                passenger
            });
        }
        renderRides();
    } catch (error) {
        console.error('Erro ao carregar solicitações:', error);
        showNotification('Erro ao carregar solicitações de carona', 'danger');
    }
}

function updateStats() {
    const total = rideRequests.length;
    const pending = rideRequests.filter(request => request.status === 'PENDING').length;
    const accepted = rideRequests.filter(request => request.status === 'ACCEPTED').length;
    const completed = rideRequests.filter(request => request.status === 'COMPLETED').length;
    const rejected = rideRequests.filter(request => request.status === 'REJECTED').length;

    document.getElementById('total-rides').textContent = total;
    document.getElementById('pending-rides').textContent = pending;
    document.getElementById('accepted-rides').textContent = accepted + completed;
    document.getElementById('rejected-rides').textContent = rejected;
}

function getStatusBadge(status) {
    const statusMap = {
        'PENDING': { class: 'status-pending', text: 'Pendente', icon: 'bi-clock' },
        'ACCEPTED': { class: 'status-accepted', text: 'Aceita', icon: 'bi-check-circle' },
        'COMPLETED': { class: 'status-accepted', text: 'Concluída', icon: 'bi-check-circle-fill' },
        'REJECTED': { class: 'status-rejected', text: 'Recusada', icon: 'bi-x-circle' },
        'CANCELLED': { class: 'status-rejected', text: 'Cancelada', icon: 'bi-x-circle' }
    };

    const statusInfo = statusMap[status] || statusMap['PENDING'];
    return `<span class="status-badge ${statusInfo.class}">
        <i class="bi ${statusInfo.icon}"></i> ${statusInfo.text}
      </span>`;
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function formatCurrency(value) {
    const basePrice = 15.00;
    const distanceMultiplier = 1.5;
    const calculatedPrice = basePrice * distanceMultiplier;

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(calculatedPrice);
}

function formatDate(dateString) {
    if (!dateString) return 'Data não definida';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

function formatTime(timeString) {
    if (!timeString) return 'Horário não definido';
    return timeString;
}

function renderRideCard(request) {
    const passenger = request.passenger || { name: 'Passageiro', email: 'N/A', phone: 'N/A' };
    const destination = request.destination || {};
    const initials = getInitials(passenger.name);
    const statusBadge = getStatusBadge(request.status);
    const isPending = request.status === 'PENDING';

    return `
        <div class="ride-card ${request.status.toLowerCase()} ${isPending ? 'pulse' : ''}">
          <div class="ride-header">
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-0">
                <i class="bi bi-person-circle"></i> Solicitação #${request.id}
              </h5>
              ${statusBadge}
            </div>
          </div>
          <div class="card-body p-4">
            <div class="d-flex align-items-center mb-3">
              <div class="passenger-avatar">${initials}</div>
              <div>
                <h6 class="mb-1">${passenger.name}</h6>
                <p class="mb-1 text-muted">
                  <i class="bi bi-envelope"></i> ${passenger.email}
                </p>
              </div>
            </div>
            <div class="bg-light rounded p-3 mb-3">
              <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span class="fw-semibold text-muted">
                  <i class="bi bi-geo-alt"></i> Origem:
                </span>
                <span class="fw-medium">${destination.startAddress || 'Endereço não definido'}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                <span class="fw-semibold text-muted">
                  <i class="bi bi-geo-alt-fill"></i> Destino:
                </span>
                <span class="fw-medium">${destination.endAddress || 'Endereço não definido'}</span>
              </div>
              <div class="d-flex justify-content-between align-items-center py-2">
                <span class="fw-semibold text-muted">
                  <i class="bi bi-clock"></i> Horário:
                </span>
                <span class="fw-medium">${destination.startTime || 'Horário não definido'}</span>
              </div>
            </div>
            ${isPending ? `
              <div class="d-flex gap-3 mt-4">
                <button class="btn-accept" onclick="window.acceptRide('${request.id}')">
                  <i class="bi bi-check-lg"></i> Aceitar
                </button>
                <button class="btn-reject" onclick="window.rejectRide('${request.id}')">
                  <i class="bi bi-x-lg"></i> Recusar
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
}

function renderRides() {
    const container = document.getElementById('rides-container');
    if (!rideRequests.length) {
        container.innerHTML = '';
        document.getElementById('empty-state').style.display = 'block';
        updateStats();
        return;
    }
    document.getElementById('empty-state').style.display = 'none';
    container.innerHTML = rideRequests.map(renderRideCard).join('');
    updateStats();
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

window.acceptRide = async function (requestId) {
    try {
        await rideRequestsRepository.updateRideRequestStatus(requestId, 'ACCEPTED');
        showNotification('Solicitação aceita com sucesso!', 'success');
        await loadRideRequests();
    } catch (error) {
        console.error('Erro ao aceitar solicitação:', error);
        showNotification('Erro ao aceitar solicitação', 'danger');
    }
};

window.rejectRide = async function (requestId) {
    try {
        await rideRequestsRepository.updateRideRequestStatus(requestId, 'REJECTED');
        showNotification('Solicitação recusada', 'info');
        await loadRideRequests();
    } catch (error) {
        console.error('Erro ao recusar solicitação:', error);
        showNotification('Erro ao recusar solicitação', 'danger');
    }
};

window.verDetalhesSolicitacao = async function (requestId) {
    const allRequests = await rideRequestsRepository.getRideRequestsByDriver(currentDriver.id);
    const acceptedRequests = allRequests.filter(r => r.status === 'ACCEPTED');
    const allUsers = await usersRepository.list();
    const destinations = [];
    for (let req of acceptedRequests) {
        try {
            const dest = await destinationsRepository.getDestinationById(req.destinationId);
            destinations.push(dest);
        } catch { }
    }
    destinations.sort((a, b) => (a.startTime > b.startTime ? 1 : -1));
    const origin = destinations.length ? { lat: destinations[0].startLat, lng: destinations[0].startLng } : null;
    const finalDest = destinations.length ? { lat: destinations[destinations.length - 1].endLat, lng: destinations[destinations.length - 1].endLng } : null;
    const waypoints = destinations.slice(1, -1).map(d => ({ location: { lat: d.startLat, lng: d.startLng }, stopover: true }));
    let infoHtml = destinations.map((d, i) => `
        <div class='mb-2'><i class='bi bi-person-circle text-primary'></i> <strong>Passageiro ${i + 1}:</strong> ${allUsers.find(u => u.id === d.userId)?.name || 'Desconhecido'}<br>
        <i class='bi bi-geo-alt text-primary'></i> <strong>Origem:</strong> ${d.startAddress}<br>
        <i class='bi bi-geo-alt-fill text-primary'></i> <strong>Destino:</strong> ${d.endAddress}<br>
        <i class='bi bi-clock text-primary'></i> <strong>Horário:</strong> ${d.startTime}</div>
      `).join('<hr>');
    document.getElementById('detalhes-info').innerHTML = infoHtml;
    setTimeout(() => {
        const map = new google.maps.Map(document.getElementById('map'), {
            center: origin || { lat: -19.9, lng: -43.9 },
            zoom: 12
        });
        if (origin && finalDest) {
            const directionsService = new google.maps.DirectionsService();
            const directionsRenderer = new google.maps.DirectionsRenderer({ map });
            directionsService.route({
                origin,
                destination: finalDest,
                waypoints,
                travelMode: google.maps.TravelMode.DRIVING,
                optimizeWaypoints: true
            }, (result, status) => {
                if (status === 'OK') {
                    directionsRenderer.setDirections(result);
                } else {
                    new google.maps.Marker({ position: origin, map, label: 'A', title: 'Origem' });
                    new google.maps.Marker({ position: finalDest, map, label: 'B', title: 'Destino' });
                }
            });
        }
    }, 300);
    const detalhesModal = new bootstrap.Modal(document.getElementById('detalhesModal'));
    detalhesModal.show();
};

document.addEventListener('DOMContentLoaded', loadRideRequests);