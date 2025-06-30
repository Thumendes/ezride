/* global bootstrap */

import { vehiclesRepository } from '../repositories/vehicles.js';
import { getLoggedUser } from '../utils.js';

const MAX_CAR_SEATS = 7;
const MOTORCYCLE_SEATS = 2;
const PLATE_PATTERNS = {
  OLD: /^[A-Z]{3}[0-9]{4}$/,
  MERCOSUL: /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/,
};

const VEHICLE_IMAGES = {
  CAR: 'https://cdn.pixabay.com/photo/2012/05/29/00/43/volkswagen-49278_1280.jpg',
  MOTORCYCLE:
    'https://cdn.pixabay.com/photo/2017/01/06/19/15/motorcycle-1957037_1280.png',
};

const carBrands = [
  'Volkswagen',
  'Fiat',
  'Chevrolet',
  'Ford',
  'Toyota',
  'Honda',
  'Hyundai',
  'Renault',
  'Nissan',
  'Jeep',
];
const motorcycleBrands = [
  'Honda',
  'Yamaha',
  'Suzuki',
  'Kawasaki',
  'BMW',
  'Ducati',
  'Harley-Davidson',
  'KTM',
  'Triumph',
  'Royal Enfield',
];

const vehiclesList = document.getElementById('vehicles-list');
const addBtn = document.getElementById('add-vehicle-btn');
const updateBtn = document.getElementById('update-btn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
let vehicleIdToDelete = null;

// Edit modal elements
const editVehicleModal = document.getElementById('editVehicleModal');
const editVehicleForm = document.getElementById('editVehicleForm');
const editTypeRadios = editVehicleForm.querySelectorAll(
  'input[name="editType"]'
);
const editBrandSelect = document.getElementById('editBrand');
const editModelInput = document.getElementById('editModel');
const editColorInput = document.getElementById('editColor');
const editLicensePlateInput = document.getElementById('editLicensePlate');
const editAvailableSeatsInput = document.getElementById('editAvailableSeats');
let vehicleIdToEdit = null;

// Alerta do modal de edição
let editAlertDiv = null;
function showEditAlert(message, variant = 'danger') {
  if (editAlertDiv) editAlertDiv.remove();
  editAlertDiv = document.createElement('div');
  editAlertDiv.className = `alert alert-${variant} alert-dismissible fade show`;
  editAlertDiv.role = 'alert';
  editAlertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  editVehicleForm.prepend(editAlertDiv);
}
function hideEditAlert() {
  if (editAlertDiv) editAlertDiv.remove();
  editAlertDiv = null;
}

const user = getLoggedUser();

if (!user) {
  window.location.href = '/login.html';
}

function getVehicleImage(type) {
  return VEHICLE_IMAGES[type] || VEHICLE_IMAGES.CAR;
}

function validateLicensePlate(plate) {
  const normalizedPlate = plate.toUpperCase().replace(/\s/g, '');
  return (
    PLATE_PATTERNS.OLD.test(normalizedPlate) ||
    PLATE_PATTERNS.MERCOSUL.test(normalizedPlate)
  );
}

function updateEditBrands(selectedType, selectedBrand) {
  const brands = selectedType === 'CAR' ? carBrands : motorcycleBrands;
  editBrandSelect.innerHTML = '<option value="">Selecione uma marca</option>';
  brands.forEach((brand) => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    if (brand === selectedBrand) option.selected = true;
    editBrandSelect.appendChild(option);
  });
}

function updateEditSeats(selectedType, value) {
  if (selectedType === 'MOTORCYCLE') {
    editAvailableSeatsInput.value = MOTORCYCLE_SEATS;
    editAvailableSeatsInput.disabled = true;
  } else {
    editAvailableSeatsInput.value = value || '';
    editAvailableSeatsInput.disabled = false;
    editAvailableSeatsInput.max = MAX_CAR_SEATS;
  }
}

async function renderVehicles() {
  const vehicles = await vehiclesRepository.getByDriverId(user.id);

  if (!vehicles || vehicles.length === 0) {
    window.location.href = '/veiculos/create.html';
    return;
  }
  vehiclesList.innerHTML = '';
  vehicles.forEach((vehicle) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-lg-4 mb-4';
    col.innerHTML = `
      <div class="card h-100 shadow-sm">
        <div class="card-body d-flex flex-column align-items-center">
          <img src="${getVehicleImage(vehicle.type)}" alt="${vehicle.brand}" class="mb-3" style="width: 100px; height: 60px; object-fit: contain;">
          <h5 class="card-title fw-bold">${vehicle.nickname || vehicle.model || vehicle.brand}</h5>
          <p class="card-text text-center mb-2">
            ${vehicle.brand}<br>${vehicle.model}<br>${vehicle.color}<br>${vehicle.licensePlate}
          </p>
          <div class="d-flex justify-content-between w-100 mt-2">
            <a href="#" class="text-danger fw-semibold me-3 vehicle-delete" data-id="${vehicle.id}">Excluir</a>
            <a href="#" class="text-primary fw-semibold vehicle-edit" data-id="${vehicle.id}">Editar</a>
          </div>
        </div>
      </div>
    `;
    vehiclesList.appendChild(col);
  });
}

vehiclesList.addEventListener('click', async (event) => {
  const target = event.target;
  if (target.classList.contains('vehicle-delete')) {
    event.preventDefault();
    vehicleIdToDelete = target.getAttribute('data-id');
    const modal = new bootstrap.Modal(
      document.getElementById('deleteVehicleModal')
    );
    modal.show();
  } else if (target.classList.contains('vehicle-edit')) {
    event.preventDefault();
    const id = target.getAttribute('data-id');
    vehicleIdToEdit = id;
    // Buscar dados do veículo
    const vehicles = await vehiclesRepository.getByDriverId(user.id);
    const vehicle = vehicles.find((v) => v.id === id);
    if (!vehicle) return;
    // Preencher campos
    editTypeRadios.forEach((radio) => {
      radio.checked = radio.value === vehicle.type;
    });
    updateEditBrands(vehicle.type, vehicle.brand);
    editModelInput.value = vehicle.model;
    editColorInput.value = vehicle.color;
    editLicensePlateInput.value = vehicle.licensePlate;
    updateEditSeats(vehicle.type, vehicle.availableSeats);
    // Atualizar marcas e assentos ao trocar tipo
    editTypeRadios.forEach((radio) => {
      radio.addEventListener('change', () => {
        updateEditBrands(radio.value, null);
        updateEditSeats(radio.value, null);
      });
    });
    hideEditAlert();
    // Abrir modal
    const modal = new bootstrap.Modal(editVehicleModal);
    modal.show();
  }
});

confirmDeleteBtn.addEventListener('click', async () => {
  if (vehicleIdToDelete) {
    await vehiclesRepository.delete(vehicleIdToDelete);
    vehicleIdToDelete = null;
    const modalEl = document.getElementById('deleteVehicleModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    modal.hide();
    renderVehicles();
  }
});

editVehicleForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideEditAlert();
  if (!vehicleIdToEdit) return;
  const type = editVehicleForm.querySelector(
    'input[name="editType"]:checked'
  ).value;
  const brand = editBrandSelect.value;
  const model = editModelInput.value;
  const color = editColorInput.value;
  const licensePlate = editLicensePlateInput.value;
  const availableSeats = parseInt(editAvailableSeatsInput.value);

  if (!brand || !model || !color || !licensePlate || !availableSeats) {
    showEditAlert('Por favor, preencha todos os campos.');
    return;
  }

  if (!validateLicensePlate(licensePlate)) {
    showEditAlert(
      'A placa deve estar no formato ABC1234 (padrão antigo) ou ABC1D23 (padrão Mercosul).'
    );
    return;
  }

  if (type === 'CAR' && availableSeats > MAX_CAR_SEATS) {
    showEditAlert(
      `O número máximo de assentos para carros é ${MAX_CAR_SEATS}.`
    );
    return;
  }

  if (type === 'MOTORCYCLE' && availableSeats !== MOTORCYCLE_SEATS) {
    showEditAlert(`Motos devem ter exatamente ${MOTORCYCLE_SEATS} assentos.`);
    return;
  }

  try {
    await vehiclesRepository.update(vehicleIdToEdit, {
      type,
      brand,
      model,
      color,
      licensePlate: licensePlate.toUpperCase().replace(/\s/g, ''),
      availableSeats,
      driverId: user.id,
    });
    vehicleIdToEdit = null;
    const modal = bootstrap.Modal.getInstance(editVehicleModal);
    modal.hide();
    renderVehicles();
  } catch (error) {
    showEditAlert('Erro ao atualizar veículo: ' + error.message);
  }
});

addBtn.addEventListener('click', () => {
  window.location.href = '/veiculos/create.html';
});

document.addEventListener('DOMContentLoaded', function() {
  renderVehicles();
});
