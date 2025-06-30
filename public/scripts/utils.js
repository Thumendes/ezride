export function createUid() {
  return Math.random().toString(36).substring(2, 15);
}

export const dialog = {
  /**
   * Abre um diálogo de confirmação.
   * @param {string} message - A mensagem a ser exibida no diálogo.
   * @param {Object} [options] - Opções adicionais para o diálogo.
   * @param {string} [options.description] - Descrição adicional a ser exibida.
   * @param {string} [options.icon] - Icone a ser exibido.
   * @param {string} [options.confirmText] - Texto do botão de confirmação.
   * @param {string} [options.cancelText] - Texto do botão de cancelamento.
   * @returns {Promise<boolean>} Retorna true se o usuário confirmar, false caso contrário.
   */
  async confirm(message, options) {
    // eslint-disable-next-line no-undef
    const result = await Swal.fire({
      title: message,
      text: options?.description || '',
      icon: options?.icon || 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: options?.confirmText || 'Sim',
      cancelButtonText: options?.cancelText || 'Não',
    });

    return result.isConfirmed;
  },
};

/**
 * Cria um utilitário de alerta para formulários
 * @param {HTMLFormElement} form - O elemento do formulário
 */
export const createFormAlert = (form) => {
  let alertElement = null;

  const createAlertElement = (message, variant) => {
    const div = document.createElement('div');
    div.className = `alert alert-${variant} alert-dismissible fade show`;
    div.role = 'alert';
    div.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    return div;
  };

  return {
    /**
     * Mostra um alerta no formulário
     * @param {string} message - A mensagem a ser exibida
     * @param {Object} options - Opções do alerta
     * @param {string} [options.variant='danger'] - Variante do alerta (danger, success, warning, info)
     * @param {string} [options.position='top'] - Posição do alerta (top, bottom)
     */
    show(message, { variant = 'danger', position = 'top' } = {}) {
      this.hide(); // Remove qualquer alerta existente

      alertElement = createAlertElement(message, variant);

      if (position === 'top') {
        form.insertBefore(alertElement, form.firstChild);
      } else {
        form.appendChild(alertElement);
      }
    },

    /**
     * Esconde o alerta atual
     */
    hide() {
      if (alertElement) {
        alertElement.remove();
        alertElement = null;
      }
    },
  };
};

// Função para validar o email
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Verifica se o usuário está logado
 * @returns {boolean}
 */
export function isUserLogged() {
  const user = localStorage.getItem('user');
  return user !== null;
}

/**
 * Obtém os dados do usuário logado
 * @returns {Object|null}
 */
export function getLoggedUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

/**
 * Verifica se o usuário tem uma role específica
 * @param {string} role - Role a ser verificada
 * @returns {boolean}
 */
export function hasRole(role) {
  const user = getLoggedUser();
  return user && user.role === role;
}

/**
 * Verifica se o usuário é motorista
 * @returns {boolean}
 */
export function isDriver() {
  return hasRole('driver');
}

/**
 * Verifica se o usuário é passageiro
 * @returns {boolean}
 */
export function isPassenger() {
  return hasRole('passenger');
}

/**
 * Redireciona para página de login se não estiver logado
 */
export function requireAuth() {
  if (!isUserLogged()) {
    window.location.href = './login.html';
  }
}

/**
 * Redireciona para página inicial se não tiver role específica
 * @param {string} role - Role necessária
 * @param {string} redirectUrl - URL para redirecionamento (padrão: index.html)
 */
export function requireRole(role, redirectUrl = './index.html') {
  requireAuth();
  if (!hasRole(role)) {
    window.location.href = redirectUrl;
  }
}

/**
 * Redireciona para página inicial se não for motorista
 */
export function requireDriver() {
  requireRole('driver');
}

/**
 * Redireciona para página inicial se não for passageiro
 */
export function requirePassenger() {
  requireRole('passenger');
}

/**
 * Filtra links do navbar baseado na role do usuário
 * @param {Array} links - Array de links do navbar
 * @returns {Array} Links filtrados
 */
export function filterNavbarLinks(links) {
  const user = getLoggedUser();
  if (!user) return links;

  return links.filter(link => {
    // Se não tem restrição de role, mostra para todos
    if (!link.roles) return true;
    
    // Se tem restrição, verifica se o usuário tem a role
    if (Array.isArray(link.roles)) {
      return link.roles.includes(user.role);
    }
    
    return link.roles === user.role;
  });
}

/**
 * Aguarda um determinado tempo
 * @param {number} ms - Tempo em milissegundos
 * @returns {Promise<void>} Retorna uma promise que resolve após o tempo especificado
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @param {number} lat1 - Latitude do primeiro ponto
 * @param {number} lon1 - Longitude do primeiro ponto
 * @param {number} lat2 - Latitude do segundo ponto
 * @param {number} lon2 - Longitude do segundo ponto
 * @returns {number} Distância em quilômetros
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}