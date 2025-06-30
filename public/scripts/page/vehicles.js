// import { vehiclesRepository } from '../repositories/vehicles.js';
import { Config } from '../config.js';
import { getLoggedUser, createFormAlert, delay } from '../utils.js';

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
  'Mercedes-Benz',
  'BMW',
  'Audi',
  'Volvo',
  'Mitsubishi',
  'Subaru',
  'Peugeot',
  'Citroën',
  'Kia',
  'Mazda',
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
  'Husqvarna',
  'Aprilia',
  'Moto Guzzi',
  'Indian',
  'Vespa',
  'Piaggio',
  'Benelli',
  'CF Moto',
  'Bajaj',
  'Hero',
];

const form = document.getElementById('vehicleForm');
const typeRadios = document.getElementsByName('type');
const brandSelect = document.getElementById('brand');
const availableSeatsInput = document.getElementById('availableSeats');

const formAlert = createFormAlert(form);

const user = getLoggedUser();

if (!user) {
  window.location.href = '/login.html';
}

async function createVehicle(vehicle) {
  try {
    const response = await fetch(`${Config.API_URL}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vehicle),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar veículo');
    }

    return await response.json();
  } catch (error) {
    throw new Error('Erro ao criar veículo: ' + error.message);
  }
}

function updateBrands() {
  const selectedType = document.querySelector(
    'input[name="type"]:checked'
  )?.value;

  if (!selectedType) return;

  const brands = selectedType === 'CAR' ? carBrands : motorcycleBrands;

  brandSelect.innerHTML = '<option value="">Selecione uma marca</option>';
  brands.forEach((brand) => {
    const option = document.createElement('option');
    option.value = brand;
    option.textContent = brand;
    brandSelect.appendChild(option);
  });
}

function updateSeats() {
  const selectedType = document.querySelector(
    'input[name="type"]:checked'
  )?.value;

  if (!selectedType) return;

  if (selectedType === 'MOTORCYCLE') {
    availableSeatsInput.value = '1';
    availableSeatsInput.disabled = true;
    availableSeatsInput.min = '1';
    availableSeatsInput.max = '1';
  } else {
    availableSeatsInput.value = '';
    availableSeatsInput.disabled = false;
    availableSeatsInput.min = '1';
    availableSeatsInput.max = '4';
  }
}

// Adicionar event listeners para os radio buttons
typeRadios.forEach((radio) => {
  radio.addEventListener('change', () => {
    updateBrands();
    updateSeats();
  });
});

// Verificar se há um tipo selecionado por padrão
document.addEventListener('DOMContentLoaded', function () {
  const carRadio = document.getElementById('car');
  if (carRadio) {
    carRadio.checked = true;
    updateBrands();
    updateSeats();
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const selectedType = document.querySelector('input[name="type"]:checked');
  if (!selectedType) {
    formAlert.show('Por favor, selecione o tipo de veículo.');
    return;
  }

  const type = selectedType.value;
  const brand = brandSelect.value;
  const model = document.getElementById('model').value;
  const color = document.getElementById('color').value;
  const licensePlate = document.getElementById('licensePlate').value;
  const availableSeats = availableSeatsInput.value;

  if (!brand || !model || !color || !licensePlate || !availableSeats) {
    formAlert.show('Por favor, preencha todos os campos.');
    return;
  }

  try {
    const vehicle = {
      type,
      brand,
      model,
      color,
      licensePlate: licensePlate.toUpperCase(),
      availableSeats: parseInt(availableSeats),
      driverId: user.id,
    };

    //  await vehiclesRepository.updateVehicleByDriverId(user.id, vehicle);

    await createVehicle(vehicle);
    formAlert.show('Veículo cadastrado com sucesso!', { variant: 'success' });
    form.reset();

    // Resetar para carro por padrão
    const carRadio = document.getElementById('car');
    if (carRadio) {
      carRadio.checked = true;
    }

    updateBrands();
    updateSeats();

    await delay(1000);

    window.location.href = '/veiculos/index.html';
  } catch (error) {
    formAlert.show('Erro ao cadastrar veículo: ' + error.message);
  }
});

// Inicializar
updateBrands();
updateSeats();
