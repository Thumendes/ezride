import { rideRequestsRepository } from '../scripts/repositories/rideRequests.js';
import { ridesRepository } from '../scripts/repositories/rides.js';
import { dialog } from '../scripts/utils.js';
import { usersRepository } from '../scripts/repositories/users.js';
import { vehiclesRepository } from '../scripts/repositories/vehicles.js';
import { getLoggedUser, isDriver } from '../scripts/utils.js';

const STATUS_CONFIG = {
    ACCEPTED: { text: 'Aceita', badge: 'bg-success text-white', description: 'A corrida foi aceita e está aguardando início.' },
    REJECTED: { text: 'Recusada', badge: 'bg-danger text-white', description: 'A corrida foi recusada pelo motorista.' },
    PENDING: { text: 'Pendente', badge: 'bg-warning', description: 'Aguardando resposta do motorista.' },
    'IN PROGRESS': { text: 'Em Andamento', badge: 'bg-primary', description: 'A corrida está em andamento. Você pode finalizar ou cancelar a qualquer momento.' },
    COMPLETED: { text: 'Finalizada', badge: 'bg-success', description: 'A corrida foi finalizada com sucesso.' },
    CANCELLED: { text: 'Cancelada', badge: 'bg-danger', description: 'A corrida foi cancelada.' }
};

const MAP_CONFIG = {
    center: { lat: -19.9167, lng: -43.9345 }, 
    zoom: 12
};

let currentRide = null;
let map = null;
let directionsService = null;
let directionsRenderer = null;
let rideStartTime = null;
let modalMap = null;
let modalDirectionsService = null;
let modalDirectionsRenderer = null;

const utils = {
    getStatusConfig(status) {
        return STATUS_CONFIG[status] || { text: status, badge: 'bg-secondary', description: '' };
    },

    formatTime(dateStr) {
        if (!dateStr) return 'Não informado';
        
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Não informado';
            
            if (typeof dateStr === 'string' && dateStr.match(/^\d{1,2}:\d{2}$/)) {
                return dateStr;
            }
            
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return 'Não informado';
        }
    },

    formatDate(dateStr) {
        if (!dateStr) return 'Não informado';
        
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Não informado';
            
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Não informado';
        }
    },

    formatDuration(startTime) {
        if (!startTime) return '00:00';
        
        try {
            const start = new Date(startTime);
            const now = new Date();
            const duration = now - start;
            
            if (duration < 0) return '00:00';
            
            const totalMinutes = Math.floor(duration / 60000);
            const seconds = Math.floor((duration % 60000) / 1000);
            
            if (totalMinutes < 60) {
                return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        } catch (error) {
            return '00:00';
        }
    },

    calculateExpectedTime(startLat, startLng, endLat, endLng) {
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
    },

    setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value || 'Não informado';
    },

    showError(message) {
        return dialog.confirm(message, { icon: 'error', confirmText: 'OK' });
    },

    showSuccess(message) {
        return dialog.confirm(message, { icon: 'success', confirmText: 'OK' });
    },

    showWarning(message) {
        return dialog.confirm(message, { icon: 'warning', confirmText: 'OK' });
    },

    formatDateTime(dateStr) {
        if (!dateStr) return 'Não informado';
        
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Não informado';
            
            if (typeof dateStr === 'string' && dateStr.match(/^\d{1,2}:\d{2}$/)) {
                return dateStr;
            }
            
            return date.toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } catch (error) {
            return 'Não informado';
        }
    }
};

const mapManager = {
    initializeMap(containerId) {
        if (typeof google === 'undefined') {
            this.loadGoogleMapsAPI().then(() => this.createMap(containerId));
        } else {
            this.createMap(containerId);
        }
    },

    loadGoogleMapsAPI() {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=geometry,places`;
            script.onload = resolve;
            document.head.appendChild(script);
        });
    },

    createMap(containerId) {
        const mapElement = document.getElementById(containerId);
        if (!mapElement) return;

        const directionsService = new google.maps.DirectionsService();
        const directionsRenderer = new google.maps.DirectionsRenderer();
        
        const map = new google.maps.Map(mapElement, {
            zoom: MAP_CONFIG.zoom,
            center: MAP_CONFIG.center,
            mapTypeId: google?.maps?.MapTypeId?.ROADMAP || 'roadmap'
        });
        
        directionsRenderer.setMap(map);
        
        return { map, directionsService, directionsRenderer };
    },

    loadRoute(mapInstance, origin, destination) {
        if (!mapInstance?.directionsService || !mapInstance?.directionsRenderer) return;

        const request = {
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING
        };

        mapInstance.directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                mapInstance.directionsRenderer.setDirections(result);
                this.fitBounds(mapInstance.map, result);
            } else {
                console.error('Erro ao carregar rota:', status);
            }
        });
    },

    fitBounds(map, result) {
        const bounds = new google.maps.LatLngBounds();
        result.routes[0].legs.forEach(leg => {
            bounds.extend(leg.start_location);
            bounds.extend(leg.end_location);
        });
        map.fitBounds(bounds);
    }
};

const rideManager = {
    async loadRideSummary() {
        try {
            const currentUser = this.getCurrentUser();
            if (!currentUser) return;

            const rideId = this.getRideId();
            
            if (!rideId) {
                this.showUserRidesList(currentUser);
                return;
            }

            await this.loadSpecificRide(rideId, currentUser);

        } catch (error) {
            utils.showError('Erro ao carregar resumo da corrida: ' + error.message);
        }
    },

    getCurrentUser() {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            window.location.href = '../login.html';
            return null;
        }
        return user;
    },

    getRideId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('rideId') || localStorage.getItem('currentRideId');
    },

    async loadSpecificRide(rideId, currentUser) {
        const rideRequests = await rideRequestsRepository.getRideRequests();
        currentRide = rideRequests.find(request => request.id === rideId);
        
        if (!currentRide) {
            utils.showError('Corrida não encontrada. Redirecionando...').then(() => {
                this.showUserRidesList(currentUser);
            });
            return;
        }

        try {
            const ride = await ridesRepository.getRideById(currentRide.rideId);
            const driver = await usersRepository.list().then(users => users.find(u => u.id === ride.driverId));
            const vehicle = await vehiclesRepository.getVehicleById(ride.vehicleId).catch(() => null);
            
            // Para motoristas, buscar informações do passageiro
            let passenger = null;
            if (isDriver()) {
                passenger = await usersRepository.list().then(users => users.find(u => u.id === currentRide.userId));
            }
            
            currentRide.ride = ride;
            currentRide.driver = driver;
            currentRide.vehicle = vehicle;
            currentRide.passenger = passenger;
        } catch (error) {
            console.error('Error fetching ride data:', error);
        }

        this.initializeRideView();
    },

    initializeRideView() {
        const mapInstance = mapManager.createMap('map');
        if (mapInstance) {
            map = mapInstance.map;
            directionsService = mapInstance.directionsService;
            directionsRenderer = mapInstance.directionsRenderer;
        }

        this.loadRideData();
        this.updateRideStatus();
        
        if (currentRide.status === 'IN PROGRESS') {
            this.startRideTimer();
        }
    },

    loadRideData() {
        if (!currentRide) return;

        const { user, ride, driver, vehicle, passenger } = currentRide;
        const currentUser = this.getCurrentUser();

        // Determinar se o usuário atual é o motorista ou passageiro
        const isUserDriver = currentUser.id === ride?.driverId;
        const isUserPassenger = currentUser.id === currentRide.userId;

        if (isUserDriver) {
            // Se é o motorista, mostrar informações do passageiro
            const passengerInfo = passenger || user;
            utils.setText('passengerName', passengerInfo?.name || 'Passageiro não encontrado');
            utils.setText('passengerEmail', passengerInfo?.email || 'Email não informado');
            
            // Mostrar informações do motorista (usuário atual)
            utils.setText('driverName', currentUser.name || 'Motorista não encontrado');
            utils.setText('driverContact', currentUser.email || 'Email não informado');
        } else if (isUserPassenger) {
            // Se é o passageiro, mostrar informações do motorista
            utils.setText('passengerName', driver?.name || 'Motorista não encontrado');
            utils.setText('passengerEmail', driver?.email || 'Email não informado');
            
            // Mostrar informações do passageiro (usuário atual)
            utils.setText('driverName', currentUser.name || 'Passageiro não encontrado');
            utils.setText('driverContact', currentUser.email || 'Email não informado');
        } else {
            // Caso padrão
            utils.setText('passengerName', user?.name || 'Não informado');
            utils.setText('passengerEmail', user?.email || 'Não informado');
            utils.setText('driverName', driver?.name || 'Motorista não encontrado');
            utils.setText('driverContact', driver?.email || 'Email não informado');
        }

        utils.setText('originAddress', ride?.startAddress || 'Endereço de origem não informado');
        utils.setText('destinationAddress', ride?.endAddress || 'Endereço de destino não informado');
        utils.setText('departureTime', ride?.startTime || 'Horário não informado');
        utils.setText('departureDate', utils.formatDate(ride?.startTime));

        // Sempre mostrar informações do veículo
        utils.setText('vehicleInfo', vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})` : 'Veículo não informado');

        if (ride?.startAddress && ride?.endAddress) {
            mapManager.loadRoute({ map, directionsService, directionsRenderer }, ride.startAddress, ride.endAddress);
        }
    },

    updateRideStatus() {
        if (!currentRide) return;

        const statusConfig = utils.getStatusConfig(currentRide.status);
        
        utils.setText('rideStatus', statusConfig.text);
        document.getElementById('rideStatus').className = `badge fs-6 px-3 py-2 ${statusConfig.badge}`;
        utils.setText('statusDescription', statusConfig.description);

        this.updateActionButtons();
        this.toggleFinalSummary();
    },

    updateActionButtons() {
        const container = document.getElementById('actionButtons');
        if (!container) return;

        container.innerHTML = '';

        const currentUser = this.getCurrentUser();
        const isUserDriver = isDriver();

        if (currentRide.status === 'IN PROGRESS') {
            container.innerHTML = `
                <button class="btn btn-success" onclick="rideActions.completeRide()">
                    <i class="bi bi-check-circle me-2"></i>Finalizar Corrida
                </button>
                <button class="btn btn-danger" onclick="rideActions.cancelRide()">
                    <i class="bi bi-x-circle me-2"></i>Cancelar Corrida
                </button>
            `;
        } else if (currentRide.status === 'ACCEPTED') {
            // Somente o motorista pode iniciar a corrida
            if (isUserDriver) {
                container.innerHTML = `
                    <button class="btn btn-primary" onclick="rideActions.startRide()">
                        <i class="bi bi-play-circle me-2"></i>Iniciar Corrida
                    </button>
                `;
            } else {
                container.innerHTML = `
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>
                        Aguardando o motorista iniciar a corrida...
                    </div>
                `;
            }
        }
    },

    toggleFinalSummary() {
        const finalSummaryElement = document.getElementById('finalSummary');
        if (!finalSummaryElement) return;

        const showSummary = currentRide.status === 'COMPLETED' || currentRide.status === 'CANCELLED';
        finalSummaryElement.style.display = showSummary ? 'block' : 'none';
        
        if (showSummary) {
            this.loadFinalSummary();
        }
    },

    loadFinalSummary() {
        if (!currentRide) return;

        let duration = '00:00';
        
        if (currentRide.rideStartTime) {
            duration = utils.formatDuration(currentRide.rideStartTime);
        } else if (rideStartTime) {
            duration = utils.formatDuration(rideStartTime);
        }
        
        const completionDate = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');

        utils.setText('tripDuration', duration);
        utils.setText('completionDate', completionDate);
    },

    startRideTimer() {
        if (!currentRide || !currentRide.rideStartTime) return;
        
        const updateTimer = () => {
            if (currentRide.status === 'IN PROGRESS') {
                const duration = utils.formatDuration(currentRide.rideStartTime);
                const timerElement = document.getElementById('rideTimer');
                if (timerElement) {
                    timerElement.textContent = duration;
                    timerElement.classList.add('timer-active');
                }
            }
        };
        
        updateTimer();
        
        const timerInterval = setInterval(updateTimer, 1000);
        
        const checkStatus = () => {
            if (currentRide.status !== 'IN PROGRESS') {
                clearInterval(timerInterval);
            }
        };
        
        const statusInterval = setInterval(checkStatus, 5000);
        
        window.addEventListener('beforeunload', () => {
            clearInterval(timerInterval);
            clearInterval(statusInterval);
        });
    },

    async showUserRidesList(currentUser) {
        const container = document.querySelector('.container');
        if (!container) return;

        const isUserDriver = isDriver();
        const title = isUserDriver ? 'Histórico de Corridas como Motorista' : 'Histórico de Viagens';

        container.innerHTML = `
            <h2 class="mb-4" style="text-align:center;">${title}</h2>
            <div class="ride-history-list" id="userRidesList"></div>
        `;

        await this.loadUserRides(currentUser);
    },

    async loadUserRides(currentUser) {
        try {
            const rideRequests = await rideRequestsRepository.getRideRequests();
            let userRides;
            
            if (isDriver()) {
                // Para motoristas, mostrar corridas onde eles são o motorista
                userRides = rideRequests.filter(ride => {
                    // Buscar a corrida para verificar se o usuário atual é o motorista
                    return ridesRepository.getRideById(ride.rideId).then(rideData => {
                        return rideData.driverId === currentUser.id;
                    }).catch(() => false);
                });
                
                // Como filter não funciona bem com async, vamos fazer de outra forma
                const allRides = await Promise.all(
                    rideRequests.map(async (request) => {
                        try {
                            const ride = await ridesRepository.getRideById(request.rideId);
                            return { ...request, ride };
                        } catch (error) {
                            return null;
                        }
                    })
                );
                
                userRides = allRides.filter(item => 
                    item && item.ride && item.ride.driverId === currentUser.id
                );
            } else {
                // Para passageiros, mostrar suas solicitações
                userRides = rideRequests.filter(ride => 
                    ride.user?.id === currentUser.id || ride.userId === currentUser.id
                );
            }

            const enrichedRides = await Promise.all(
                userRides.map(async (request) => {
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

            this.renderUserRides(enrichedRides);
        } catch (error) {
            console.error('Erro ao carregar corridas do usuário:', error);
            this.showErrorState();
        }
    },

    renderUserRides(userRides) {
        const container = document.getElementById('userRidesList');
        if (!container) return;

        if (userRides.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        container.innerHTML = '';
        userRides.forEach(ride => {
            const card = this.createRideCard(ride);
            container.appendChild(card);
        });
    },

    getEmptyStateHTML() {
        const isUserDriver = isDriver();
        const message = isUserDriver ? 
            'Você ainda não possui corridas como motorista.' : 
            'Você ainda não possui corridas registradas.';
        
        return `
            <div class='text-center py-5'>
                <i class='bi bi-car-front fs-1 text-muted mb-3'></i>
                <h4 class='text-muted'>Nenhuma corrida encontrada</h4>
                <p class='text-muted'>${message}</p>
                <a href='../index.html' class='btn btn-primary'>
                    <i class='bi bi-house me-2'></i>Voltar ao Início
                </a>
            </div>
        `;
    },

    createRideCard(ride) {
        const card = document.createElement('div');
        card.className = 'ride-history-card';
        
        const title = `Corrida #${ride.id}`;
        const statusConfig = utils.getStatusConfig(ride.status);
        const statusBadge = `<span class='ride-history-status ${statusConfig.badge}'>${statusConfig.text}</span>`;
        const departureTime = utils.formatTime(ride.startTime);

        const currentUser = rideManager.getCurrentUser();
        const isUserDriver = isDriver();
        
        let userInfo = '';
        if (isUserDriver) {
            // Para motoristas, mostrar informações do passageiro
            const passenger = ride.passenger || ride.user;
            const passengerName = passenger?.name || 'Passageiro não encontrado';
            const passengerEmail = passenger?.email || 'Email não informado';
            userInfo = `
                <div class='ride-history-meta'>
                    <span class='text-primary'><i class='bi bi-person'></i> Passageiro: ${passengerName}</span>
                </div>
                <div class='ride-history-meta'>
                    <span class='text-info'><i class='bi bi-envelope'></i> ${passengerEmail}</span>
                </div>
            `;
        } else {
            // Para passageiros, mostrar informações do motorista
            const driver = ride.driverResponse || ride.driver;
            const driverName = driver?.name || 'Motorista não encontrado';
            const driverEmail = driver?.email || 'Email não informado';
            const vehicleInfo = ride.vehicle ? `${ride.vehicle.brand} ${ride.vehicle.model} (${ride.vehicle.licensePlate})` : 'Veículo não informado';
            
            userInfo = `
                <div class='ride-history-meta'>
                    <span class='text-primary'><i class='bi bi-person'></i> Motorista: ${driverName}</span>
                </div>
                <div class='ride-history-meta'>
                    <span class='text-info'><i class='bi bi-envelope'></i> ${driverEmail}</span>
                </div>
                <div class='ride-history-meta'>
                    <span class='text-success'><i class='bi bi-car-front'></i> ${vehicleInfo}</span>
                </div>
            `;
        }

        card.innerHTML = `
            <div class='ride-history-info'>
                <div class='ride-history-title'>${title}</div>
                <div class='ride-history-address'><i class='bi bi-geo-alt'></i> ${ride.ride?.startAddress || 'Origem não informada'}</div>
                <div class='ride-history-address'><span style='color:#120022;font-size:1.2em;'>&#8595;</span> ${ride.ride?.endAddress || 'Destino não informado'}</div>
                <div class='ride-history-meta'>
                    <span class='text-danger'><i class='bi bi-clock'></i> Saída: ${departureTime}</span>
                </div>
                ${userInfo}
            </div>
            <div class='ride-history-actions'>
                ${statusBadge}
                <button class='ride-history-btn' onclick="modalManager.showRideModal('${ride.id}')"><i class='bi bi-eye'></i> Ver</button>
            </div>
        `;

        return card;
    },

    showErrorState() {
        const container = document.getElementById('userRidesList');
        if (container) {
            container.innerHTML = `
                <div class='alert alert-danger'>
                    <h4>Erro ao carregar corridas</h4>
                    <p>Não foi possível carregar suas corridas.</p>
                    <button class='btn btn-outline-danger' onclick='location.reload()'>Tentar Novamente</button>
                </div>
            `;
        }
    }
};

const modalManager = {
    async showRideModal(rideId) {
        try {
            const ride = await this.getRideById(rideId);
            if (!ride) {
                utils.showError('Corrida não encontrada.');
                return;
            }

            this.clearModalFields();
            await this.loadModalRideData(ride);
            this.updateModalRideStatus(ride);
            this.initializeModalMap(ride);

            const modal = new bootstrap.Modal(document.getElementById('rideDetailsModal'));
            modal.show();

            document.getElementById('rideDetailsModal').addEventListener('hidden.bs.modal', this.clearModalFields, { once: true });
            
        } catch (error) {
            console.error('Erro ao carregar dados da corrida:', error);
            utils.showError('Erro ao carregar dados da corrida: ' + error.message);
        }
    },

    async getRideById(rideId) {
        const rideRequests = await rideRequestsRepository.getRideRequests();
        const request = rideRequests.find(request => request.id === rideId);
        
        if (!request) return null;

        try {
            const ride = await ridesRepository.getRideById(request.rideId);
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
            console.error('Error fetching ride data:', error);
            return request;
        }
    },

    clearModalFields() {
        const fields = [
            'modalPassengerName', 'modalPassengerEmail', 'modalOriginAddress', 'modalDestinationAddress',
            'modalDepartureTime', 'modalDepartureDate', 'modalExpectedTime', 'modalDriverName', 'modalVehicleInfo',
            'modalDriverContact', 'modalRideStatus', 'modalStatusDescription', 'modalTripDuration',
            'modalCompletionDate', 'modalTripNotes'
        ];

        fields.forEach(field => utils.setText(field, ''));
        
        document.getElementById('modalActionButtons').innerHTML = '';
        document.getElementById('modalMap').innerHTML = '';
        document.getElementById('modalFinalSummary').style.display = 'none';
    },

    async loadModalRideData(ride) {
        if (!ride) return;

        const { user, ride: rideData, driver, vehicle, passenger } = ride;
        const currentUser = rideManager.getCurrentUser();

        // Determinar se o usuário atual é o motorista ou passageiro
        const isDriver = currentUser.id === rideData?.driverId;
        const isPassenger = currentUser.id === ride.userId;

        if (isDriver) {
            // Se é o motorista, mostrar informações do passageiro
            const passengerInfo = passenger || user;
            utils.setText('modalPassengerName', passengerInfo?.name || 'Passageiro não encontrado');
            utils.setText('modalPassengerEmail', passengerInfo?.email || 'Email não informado');
            
            // Mostrar informações do motorista (usuário atual)
            utils.setText('modalDriverName', currentUser.name || 'Motorista não encontrado');
            utils.setText('modalDriverContact', currentUser.email || 'Email não informado');
        } else if (isPassenger) {
            // Se é o passageiro, mostrar informações do motorista
            utils.setText('modalPassengerName', driver?.name || 'Motorista não encontrado');
            utils.setText('modalPassengerEmail', driver?.email || 'Email não informado');
            
            // Mostrar informações do passageiro (usuário atual)
            utils.setText('modalDriverName', currentUser.name || 'Passageiro não encontrado');
            utils.setText('modalDriverContact', currentUser.email || 'Email não informado');
        } else {
            // Caso padrão
            utils.setText('modalPassengerName', user?.name || 'Não informado');
            utils.setText('modalPassengerEmail', user?.email || 'Não informado');
            utils.setText('modalDriverName', driver?.name || 'Motorista não encontrado');
            utils.setText('modalDriverContact', driver?.email || 'Email não informado');
        }

        utils.setText('modalOriginAddress', rideData?.startAddress || 'Endereço de origem não informado');
        utils.setText('modalDestinationAddress', rideData?.endAddress || 'Endereço de destino não informado');
        
        const departureTime = ride.startTime ? ride.startTime : 
                             ride.createdAt ? ride.createdAt : 
                             rideData?.startTime || 'Horário não informado';
        
        utils.setText('modalDepartureTime', utils.formatTime(departureTime));
        utils.setText('modalDepartureDate', utils.formatDate(departureTime));

        const expectedTime = utils.calculateExpectedTime(
            rideData?.startLat, 
            rideData?.startLng, 
            rideData?.endLat, 
            rideData?.endLng
        );
        utils.setText('modalExpectedTime', expectedTime);

        // Sempre mostrar informações do veículo
        utils.setText('modalVehicleInfo', vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})` : 'Veículo não informado');
    },

    updateModalRideStatus(ride) {
        if (!ride) return;

        const statusConfig = utils.getStatusConfig(ride.status);
        
        utils.setText('modalRideStatus', statusConfig.text);
        document.getElementById('modalRideStatus').className = `badge fs-6 px-3 py-2 ${statusConfig.badge}`;
        utils.setText('modalStatusDescription', statusConfig.description);

        const timerContainer = document.getElementById('rideTimerContainer');
        if (timerContainer) {
            if (ride.status === 'IN PROGRESS' && ride.rideStartTime) {
                timerContainer.style.display = 'block';
                this.startModalTimer(ride);
            } else {
                timerContainer.style.display = 'none';
            }
        }

        this.updateModalActionButtons(ride);
        this.toggleModalFinalSummary(ride);
    },

    startModalTimer(ride) {
        if (!ride.rideStartTime) return;
        
        const updateTimer = () => {
            const duration = utils.formatDuration(ride.rideStartTime);
            const timerElement = document.getElementById('rideTimer');
            if (timerElement) {
                timerElement.textContent = duration;
            }
        };
        
        updateTimer();
        
        const timerInterval = setInterval(updateTimer, 1000);
        
        const modal = document.getElementById('rideDetailsModal');
        if (modal) {
            modal.addEventListener('hidden.bs.modal', () => {
                clearInterval(timerInterval);
            }, { once: true });
        }
    },

    updateModalActionButtons(ride) {
        const container = document.getElementById('modalActionButtons');
        if (!container) return;

        container.innerHTML = '';

        const currentUser = rideManager.getCurrentUser();
        const isUserDriver = isDriver();

        if (ride.status === 'IN PROGRESS') {
            container.innerHTML = `
                <button class="btn btn-success btn-sm" onclick="rideActions.completeRideFromModal('${ride.id}')">
                    <i class="bi bi-check-circle me-1"></i>Finalizar
                </button>
                <button class="btn btn-danger btn-sm" onclick="rideActions.cancelRideFromModal('${ride.id}')">
                    <i class="bi bi-x-circle me-1"></i>Cancelar
                </button>
            `;
        } else if (ride.status === 'ACCEPTED') {
            // Somente o motorista pode iniciar a corrida
            if (isUserDriver) {
                container.innerHTML = `
                    <button class="btn btn-primary btn-sm" onclick="rideActions.startRideFromModal('${ride.id}')">
                        <i class="bi bi-play-circle me-1"></i>Iniciar
                    </button>
                `;
            } else {
                container.innerHTML = `
                    <div class="alert alert-info py-2 px-3 mb-0">
                        <i class="bi bi-info-circle me-2"></i>
                        Aguardando o motorista iniciar a corrida...
                    </div>
                `;
            }
        }
    },

    toggleModalFinalSummary(ride) {
        const finalSummaryElement = document.getElementById('modalFinalSummary');
        if (!finalSummaryElement) return;

        const showSummary = ride.status === 'COMPLETED' || ride.status === 'CANCELLED';
        finalSummaryElement.style.display = showSummary ? 'block' : 'none';
        
        if (showSummary) {
            this.loadModalFinalSummary(ride);
        }
    },

    loadModalFinalSummary(ride) {
        let duration = '00:00';
        
        if (ride.rideStartTime) {
            const startTime = new Date(ride.rideStartTime);
            const endTime = ride.completedAt ? new Date(ride.completedAt) : new Date();
            const durationMs = endTime - startTime;
            
            const totalMinutes = Math.floor(durationMs / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            
            if (totalMinutes < 60) {
                duration = `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        } else if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {

            const expectedTime = utils.calculateExpectedTime(
                ride.ride?.startLat, 
                ride.ride?.startLng, 
                ride.ride?.endLat, 
                ride.ride?.endLng
            );
            duration = expectedTime;
        }
        
        utils.setText('modalTripDuration', duration);
        utils.setText('modalCompletionDate', new Date().toLocaleDateString('pt-BR'));
        utils.setText('modalTripNotes', 'Corrida realizada com sucesso.');
    },

    initializeModalMap(ride) {
        setTimeout(() => {
            const mapInstance = mapManager.createMap('modalMap');
            if (mapInstance) {
                modalMap = mapInstance.map;
                modalDirectionsService = mapInstance.directionsService;
                modalDirectionsRenderer = mapInstance.directionsRenderer;
            }

            if (ride.ride?.startAddress && ride.ride?.endAddress) {
                mapManager.loadRoute(
                    { map: modalMap, directionsService: modalDirectionsService, directionsRenderer: modalDirectionsRenderer },
                    ride.ride.startAddress,
                    ride.ride.endAddress
                );
            }
        }, 300);
    }
};

const rideActions = {
    async startRide() {
        try {
            if (!currentRide) {
                utils.showError('Nenhuma corrida selecionada.');
                return;
            }
            
            await rideRequestsRepository.updateRideRequestStatus(currentRide.id, 'IN PROGRESS');
            
            try {
                await fetch(`${window.location.origin}/ride-requests/${currentRide.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rideStartTime: new Date().toISOString() }),
                });
            } catch (error) {
                console.error('Erro ao salvar tempo de início:', error);
            }
            
            utils.showSuccess('Corrida iniciada com sucesso!').then(() => {
                this.refreshRidesList();
                this.closeModal();
            });
        } catch (error) {
            utils.showError('Erro ao iniciar corrida: ' + error.message);
        }
    },

    completeRide() {
        if (!currentRide) {
            utils.showError('Nenhuma corrida selecionada.');
            return;
        }
        
        this.showConfirmationModal(
            'Finalizar Corrida',
            'Tem certeza que deseja finalizar esta corrida?',
            async () => {
                try {
                    await rideRequestsRepository.updateRideRequestStatus(currentRide.id, 'COMPLETED');
                    
                    try {
                        await fetch(`${window.location.origin}/ride-requests/${currentRide.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ completedAt: new Date().toISOString() }),
                        });
                    } catch (error) {
                        console.error('Erro ao salvar tempo de finalização:', error);
                    }
                    
                    utils.showSuccess('Corrida finalizada com sucesso!').then(() => {
                        this.refreshRidesList();
                    });
                } catch (error) {
                    utils.showError('Erro ao finalizar corrida: ' + error.message);
                }
            }
        );
    },

    cancelRide() {
        if (!currentRide) {
            utils.showError('Nenhuma corrida selecionada.');
            return;
        }
        
        this.showConfirmationModal(
            'Cancelar Corrida',
            'Tem certeza que deseja cancelar esta corrida? Esta ação não pode ser desfeita.',
            async () => {
                try {
                    await rideRequestsRepository.updateRideRequestStatus(currentRide.id, 'CANCELLED');
                    
                    try {
                        await fetch(`${window.location.origin}/ride-requests/${currentRide.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ completedAt: new Date().toISOString() }),
                        });
                    } catch (error) {
                        console.error('Erro ao salvar tempo de cancelamento:', error);
                    }
                    
                    utils.showSuccess('Corrida cancelada com sucesso!').then(() => {
                        this.refreshRidesList();
                    });
                } catch (error) {
                    utils.showError('Erro ao cancelar corrida: ' + error.message);
                }
            }
        );
    },

    async startRideFromModal(rideId) {
        try {
            await rideRequestsRepository.updateRideRequestStatus(rideId, 'IN PROGRESS');
            
            try {
                await fetch(`${Config.API_URL}/ride-requests/${rideId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rideStartTime: new Date().toISOString() }),
                });
            } catch (error) {
                console.error('Erro ao salvar tempo de início:', error);
            }
            
            utils.showSuccess('Corrida iniciada com sucesso!').then(() => {
                this.refreshRidesList();
                this.closeModal();
            });
        } catch (error) {
            utils.showError('Erro ao iniciar corrida: ' + error.message);
        }
    },

    completeRideFromModal(rideId) {
        this.showConfirmationModal(
            'Finalizar Corrida',
            'Tem certeza que deseja finalizar esta corrida?',
            async () => {
                try {
                    await rideRequestsRepository.updateRideRequestStatus(rideId, 'COMPLETED');
                    
                    try {
                        await fetch(`${window.location.origin}/ride-requests/${rideId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ completedAt: new Date().toISOString() }),
                        });
                    } catch (error) {
                        console.error('Erro ao salvar tempo de finalização:', error);
                    }
                    
                    utils.showSuccess('Corrida finalizada com sucesso!').then(() => {
                        this.refreshRidesList();
                        this.closeModal();
                    });
                } catch (error) {
                    utils.showError('Erro ao finalizar corrida: ' + error.message);
                }
            }
        );
    },

    cancelRideFromModal(rideId) {
        this.showConfirmationModal(
            'Cancelar Corrida',
            'Tem certeza que deseja cancelar esta corrida? Esta ação não pode ser desfeita.',
            async () => {
                try {
                    await rideRequestsRepository.updateRideRequestStatus(rideId, 'CANCELLED');
                    
                    try {
                        await fetch(`${window.location.origin}/ride-requests/${rideId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ completedAt: new Date().toISOString() }),
                        });
                    } catch (error) {
                        console.error('Erro ao salvar tempo de cancelamento:', error);
                    }
                    
                    utils.showSuccess('Corrida cancelada com sucesso!').then(() => {
                        this.refreshRidesList();
                        this.closeModal();
                    });
                } catch (error) {
                    utils.showError('Erro ao cancelar corrida: ' + error.message);
                }
            }
        );
    },

    showConfirmationModal(title, message, onConfirm) {
        utils.setText('confirmationTitle', title);
        utils.setText('confirmationMessage', message);
        
        const confirmButton = document.getElementById('confirmAction');
        confirmButton.onclick = () => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
            if (modal) modal.hide();
            onConfirm();
        };
        
        const modal = new bootstrap.Modal(document.getElementById('confirmationModal'), {
            backdrop: 'static',
            keyboard: false
        });
        modal.show();
    },

    refreshRidesList() {
        const currentUser = rideManager.getCurrentUser();
        if (currentUser) {
            rideManager.loadUserRides(currentUser);
        }
    },

    closeModal() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('rideDetailsModal'));
        if (modal) modal.hide();
    }
};

const ridesListRenderer = {
    async renderRidesList() {
        console.log('Iniciando renderRidesList...');
        const currentUser = rideManager.getCurrentUser();
        const ridesList = document.getElementById('ridesList');
        
        if (!currentUser || !ridesList) {
            console.warn('Usuário não logado ou container ridesList não encontrado.');
            return;
        }

        ridesList.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>';

        try {
            const rideRequests = await rideRequestsRepository.getRideRequests();
            const userRides = rideRequests.filter(ride => 
                ride.user?.id === currentUser.id || ride.userId === currentUser.id
            );

            const enrichedRides = await Promise.all(
                userRides.map(async (request) => {
                    try {
                        const ride = await ridesRepository.getRideById(request.rideId);
                        const driver = await usersRepository.list().then(users => users.find(u => u.id === ride.driverId));
                        const vehicle = await vehiclesRepository.getVehicleById(ride.vehicleId).catch(() => null);
                        
                        return {
                            ...request,
                            ride: ride,
                            driver: driver,
                            vehicle: vehicle
                        };
                    } catch (error) {
                        console.error(`Error fetching ride ${request.rideId}:`, error);
                        return request;
                    }
                })
            );

            this.renderRides(enrichedRides, ridesList);
        } catch (error) {
            ridesList.innerHTML = '<div class="alert alert-danger">Erro ao carregar suas corridas.</div>';
            console.error('Erro ao carregar rides:', error);
        }
    },

    renderRides(userRides, container) {
        if (userRides.length === 0) {
            container.innerHTML = this.getEmptyRidesHTML();
            return;
        }

        container.innerHTML = '';
        userRides.forEach(ride => {
            const col = this.createRideColumn(ride);
            container.appendChild(col);
        });
    },

    getEmptyRidesHTML() {
        return `
            <div class='text-center py-5'>
                <i class='bi bi-car-front fs-1 text-muted mb-3'></i>
                <h4 class='text-muted'>Nenhuma corrida encontrada</h4>
                <p class='text-muted'>Você ainda não possui corridas registradas.</p>
                <a href='../index.html' class='btn btn-primary'>
                    <i class='bi bi-house me-2'></i>Voltar ao Início
                </a>
            </div>
        `;
    },

    createRideColumn(ride) {
        const title = `Corrida #${ride.id.slice(-6)}`;
        const statusConfig = utils.getStatusConfig(ride.status);
        
        const departureTime = ride.startTime ? utils.formatTime(ride.startTime) : 
                             ride.createdAt ? utils.formatTime(ride.createdAt) : 
                             ride.ride?.startTime ? utils.formatTime(ride.ride.startTime) : 'Não informado';
        
        const requestDate = ride.createdAt ? utils.formatDate(ride.createdAt) : 'Não informado';
        
        const col = document.createElement('div');
        col.className = 'col-12 col-md-10 col-lg-8 mb-4';
        col.innerHTML = `
            <div class='ride-summary-card'>
                <div class='card-body'>
                    <div class='ride-summary-header'>
                        <h5 class='ride-summary-title'>
                            <i class='bi bi-car-front me-2'></i>${title}
                        </h5>
                        <span class='ride-summary-status ${statusConfig.badge}'>
                            ${statusConfig.text}
                        </span>
                    </div>
                    
                    <div class='ride-summary-route'>
                        <div class='ride-summary-origin'>
                            <strong class='text-success'>Origem:</strong>
                            <p class='mb-0 text-muted'>${ride.ride?.startAddress || 'Origem não informada'}</p>
                        </div>
                        <div class='ride-summary-destination'>
                            <strong class='text-danger'>Destino:</strong>
                            <p class='mb-0 text-muted'>${ride.ride?.endAddress || 'Destino não informado'}</p>
                        </div>
                    </div>
                    
                    <div class='ride-summary-info'>
                        <div class='ride-summary-info-item'>
                            <i class='bi bi-clock text-warning'></i>
                            <div class='ride-summary-info-content'>
                                <div class='ride-summary-info-label'>Horário de Saída</div>
                                <div class='ride-summary-info-value'>${departureTime}</div>
                            </div>
                        </div>
                        <div class='ride-summary-info-item'>
                            <i class='bi bi-calendar text-info'></i>
                            <div class='ride-summary-info-content'>
                                <div class='ride-summary-info-label'>Data da Solicitação</div>
                                <div class='ride-summary-info-value'>${requestDate}</div>
                            </div>
                        </div>
                        <div class='ride-summary-info-item'>
                            <i class='bi bi-stopwatch text-primary'></i>
                            <div class='ride-summary-info-content'>
                                <div class='ride-summary-info-label'>Tempo Estimado</div>
                                <div class='ride-summary-info-value'>${utils.calculateExpectedTime(
                                    ride.ride?.startLat, 
                                    ride.ride?.startLng, 
                                    ride.ride?.endLat, 
                                    ride.ride?.endLng
                                )}</div>
                            </div>
                        </div>
                        <div class='ride-summary-info-item'>
                            <i class='bi bi-person text-primary'></i>
                            <div class='ride-summary-info-content'>
                                <div class='ride-summary-info-label'>Motorista</div>
                                <div class='ride-summary-info-value'>${ride.driver?.name || 'Não informado'}</div>
                            </div>
                        </div>
                        <div class='ride-summary-info-item'>
                            <i class='bi bi-car-front text-success'></i>
                            <div class='ride-summary-info-content'>
                                <div class='ride-summary-info-label'>Veículo</div>
                                <div class='ride-summary-info-value'>${ride.vehicle?.brand} ${ride.vehicle?.model} (${ride.vehicle?.licensePlate})</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class='ride-summary-actions'>
                        <button class='ride-summary-btn ride-summary-btn-outline' onclick="modalManager.showRideModal('${ride.id}')">
                            <i class='bi bi-eye'></i>Ver Detalhes
                        </button>
                    </div>
                </div>
            </div>
        `;

        return col;
    }
};

window.showRideModal = (rideId) => modalManager.showRideModal(rideId);
window.startRide = () => rideActions.startRide();
window.completeRide = () => rideActions.completeRide();
window.cancelRide = () => rideActions.cancelRide();
window.startRideFromModal = (rideId) => rideActions.startRideFromModal(rideId);
window.completeRideFromModal = (rideId) => rideActions.completeRideFromModal(rideId);
window.cancelRideFromModal = (rideId) => rideActions.cancelRideFromModal(rideId);
window.modalManager = modalManager;
window.rideActions = rideActions;

rideManager.loadRideSummary();
window.addEventListener('DOMContentLoaded', () => ridesListRenderer.renderRidesList());