// Dados simulados da carona com dois passageiros
const carona = {
  passageiros: [
    {
      nome: 'Ana Paula',
      origem: 'Rua das Flores, 123',
      destino: 'Av. Brasil, 456',
      status: 'pendente',
    },
    {
      nome: 'Carlos Henrique',
      origem: 'Rua das Palmeiras, 789',
      destino: 'Av. Brasil, 456',
      status: 'pendente',
    },
    {
      nome: 'Miguel Freitas',
      origem: 'Rua das Banans, 789',
      destino: 'Av. Brasil, 456',
      status: 'pendente',
    },
  ],
};

// Exibe cada passageiro na tela
const container = document.getElementById('infoPassageiros');

carona.passageiros.forEach((passageiro, index) => {
  const div = document.createElement('div');
  div.innerHTML = `
      <h3>Passageiro ${index + 1}</h3>
      <p><strong>Nome:</strong> ${passageiro.nome}</p>
      <p><strong>Origem:</strong> ${passageiro.origem}</p>
      <p><strong>Destino:</strong> ${passageiro.destino}</p>
      <button onclick="aceitarCarona(${index})">Aceitar</button>
      <button class="negar" onclick="negarCarona(${index})">Negar</button>
      <p id="status-${index}"><strong>Status:</strong> ${passageiro.status}</p>
      <hr>
    `;
  container.appendChild(div);
});

// Funções de ação por passageiro
function aceitarCarona(index) {
  carona.passageiros[index].status = 'aceita';
  document.getElementById(`status-${index}`).innerHTML =
    `<strong>Status:</strong> aceita ✅`;
}

function negarCarona(index) {
  carona.passageiros[index].status = 'negada';
  document.getElementById(`status-${index}`).innerHTML =
    `<strong>Status:</strong> negada ❌`;
}
