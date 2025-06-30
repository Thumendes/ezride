import { requireAuth, getLoggedUser, filterNavbarLinks } from './utils.js';

const path = window.location.pathname;
const isAuthPage = /login\.html$|register\.html$/i.test(path);
const isHomePage = /index\.html$|\/$/.test(path);

if (!isAuthPage && !isHomePage) {
  requireAuth();
}

setupDynamicHeader();
setupGlobalStyles();

function setupLogout() {
  addLogoutButton();
}

function setupDynamicHeader() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  navbar.classList.add('navbar-modern');
  
  const brand = navbar.querySelector('.navbar-brand');
  if (brand) {
    brand.innerHTML = '<i class="bi bi-car-front text-primary"></i> EzRide';
    brand.classList.add('fw-bold', 'fs-4');
  }

  const style = document.createElement('style');
  style.textContent = `
    .navbar-modern {
      background: rgba(255, 255, 255, 0.95) !important;
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      padding: 1rem 0;
    }

    .navbar-modern .navbar-brand {
      color: #2c3e50 !important;
      font-weight: 700;
    }

    .navbar-modern .navbar-brand:hover {
      transform: translateY(-1px);
    }

    .navbar-modern .navbar-nav .nav-link {
      color: #2c3e50 !important;
      font-weight: 500;
      padding: 0.5rem 1rem !important;
      border-radius: 8px;
      transition: all 0.3s ease;
      margin: 0 0.25rem;
    }

    .navbar-modern .navbar-nav .nav-link:hover {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white !important;
      transform: translateY(-1px);
    }

    .navbar-modern .btn-outline-danger {
      border: 2px solid #e74c3c;
      color: #e74c3c;
      font-weight: 600;
      padding: 0.5rem 1.5rem;
      border-radius: 25px;
      transition: all 0.3s ease;
    }

    .navbar-modern .btn-outline-danger:hover {
      background: #e74c3c;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(231, 76, 60, 0.3);
    }

    .page-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 0 2rem;
      margin-bottom: 2rem;
      position: relative;
      overflow: hidden;
      z-index: 1 !important;
    }

    .page-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 100" fill="white" opacity="0.1"><polygon points="0,100 1000,0 1000,100"/></svg>');
      background-size: cover;
    }

    .page-header .container {
      position: relative;
      z-index: 2;
    }

    .page-header h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
    }

    .page-header p {
      font-size: 1.1rem;
      opacity: 0.9;
      margin-bottom: 0;
    }

    .modern-card {
      background: white;
      border-radius: 15px;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
      border: none;
      transition: all 0.3s ease;
      overflow: hidden;
    }

    .modern-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
    }

    .modern-card .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 1.5rem;
    }

    .modern-card .card-body {
      padding: 2rem;
    }

    .modern-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      font-weight: 600;
      padding: 0.75rem 1.5rem;
      border-radius: 25px;
      transition: all 0.3s ease;
      text-decoration: none;
      display: inline-block;
    }

    .modern-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
      color: white;
    }

    .modern-btn-outline {
      background: transparent;
      border: 2px solid #667eea;
      color: #667eea;
    }

    .modern-btn-outline:hover {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-color: transparent;
    }

    .modern-table {
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
    }

    .modern-table thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .modern-table th {
      border: none;
      padding: 1rem;
      font-weight: 600;
    }

    .modern-table td {
      padding: 1rem;
      border-color: rgba(0, 0, 0, 0.05);
    }

    .modern-form {
      background: white;
      border-radius: 15px;
      padding: 2rem;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.08);
    }

    .modern-form .form-control {
      border-radius: 10px;
      border: 2px solid #e9ecef;
      padding: 0.75rem 1rem;
      transition: all 0.3s ease;
    }

    .modern-form .form-control:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25);
    }

    .modern-modal .modal-content {
      border-radius: 15px;
      border: none;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    }

    .modern-modal .modal-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 15px 15px 0 0;
    }

    .modern-modal .modal-body {
      padding: 2rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #6c757d;
    }

    .empty-state i {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h5 {
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .empty-state p {
      font-size: 1.1rem;
      margin-bottom: 2rem;
    }

    .stats-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 15px;
      padding: 2rem;
      text-align: center;
      margin-bottom: 1rem;
    }

    .stats-card .number {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
    }

    .stats-card .label {
      font-size: 1rem;
      opacity: 0.9;
    }

    @media (max-width: 768px) {
      .page-header h1 {
        font-size: 2rem;
      }
      
      .modern-card .card-body {
        padding: 1.5rem;
      }
    }

    .navbar {
      position: relative;
      z-index: 1001 !important;
    }

    .dropdown-menu.dropdown-menu-end {
      z-index: 2000 !important;
      position: absolute !important;
    }
  `;
  document.head.appendChild(style);
}

function setupGlobalStyles() {
  if (!document.querySelector('#global-styles')) {
    const globalStyle = document.createElement('style');
    globalStyle.id = 'global-styles';
    globalStyle.textContent = `
      body {
        font-family: 'Nunito', sans-serif;
        background-color: #f8f9fa;
      }

      .container {
        max-width: 1200px;
      }

      .section-padding {
        padding: 3rem 0;
      }

      .text-gradient {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .dropdown-menu.dropdown-menu-end{
        z-index: 99999 !important;
      }
    `;
    document.head.appendChild(globalStyle);
  }
}

function addLogoutButton() {
  const oldBtn = document.getElementById('logout-btn');
  if (oldBtn && oldBtn.parentNode) oldBtn.parentNode.remove();
  const oldMenu = document.getElementById('user-menu-dropdown');
  if (oldMenu && oldMenu.parentNode) oldMenu.parentNode.remove();

  const navbar = document.querySelector('.navbar-nav.ms-auto');
  if (!navbar) return;

  const user = getLoggedUser();
  console.log('Usuário logado:', user);
  if (!user) return;

  const displayName = user.name ? user.name.split(' ')[0] : (user.email || 'Perfil');

  const li = document.createElement('li');
  li.classList.add('nav-item', 'dropdown');
  li.id = 'user-menu-dropdown';
  li.innerHTML = `
    <a class="nav-link dropdown-toggle d-flex align-items-center gap-2" href="#" id="userDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
      <i class="bi bi-person-circle fs-5"></i>
      <span class="fw-bold">${displayName}</span>
    </a>
    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
      <li><span class="dropdown-item-text text-muted small">${user.email || ''}</span></li>
      <li><hr class="dropdown-divider"></li>
      <li><a class="dropdown-item text-danger" href="#" id="logout-btn"><i class="bi bi-box-arrow-right"></i> Sair</a></li>
    </ul>
      `;
  navbar.appendChild(li);

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(event) {
      event.preventDefault();
      handleLogout();
      const dropdown = document.getElementById('userDropdown');
      if (dropdown && window.bootstrap) {
        const dd = window.bootstrap.Dropdown.getOrCreateInstance(dropdown);
        dd.hide();
      }
    });
  }
}

function handleLogout() {
  localStorage.removeItem('user');
  
  const currentPath = window.location.pathname;
  let loginPath = './login.html';
  
  if (currentPath.includes('/admin/') || 
      currentPath.includes('/motorista/') || 
      currentPath.includes('/veiculos/') || 
      currentPath.includes('/caronas/') || 
      currentPath.includes('/historico/') || 
      currentPath.includes('/resumo/') ||
      currentPath.includes('/davi/')) {
    loginPath = '../login.html';
  }
  
  window.location.href = loginPath;
}

window.createPageHeader = function(title, subtitle = '') {
  const container = document.querySelector('.container');
  if (!container) return;

  const headerHTML = `
    <div class="page-header">
      <div class="container">
        <h1>${title}</h1>
        ${subtitle ? `<p>${subtitle}</p>` : ''}
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforebegin', headerHTML);
};

window.applyModernClasses = function() {
  document.querySelectorAll('.card').forEach(card => {
    card.classList.add('modern-card');
  });

  document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.classList.add('modern-btn');
  });

  document.querySelectorAll('.table').forEach(table => {
    table.classList.add('modern-table');
  });

  document.querySelectorAll('form').forEach(form => {
    form.classList.add('modern-form');
  });

  document.querySelectorAll('.modal-content').forEach(modal => {
    modal.classList.add('modern-modal');
  });
};

window.logout = function() {
  handleLogout();
};

window.addCommonNavbarElements = function() {
  addLogoutButton();
};

function renderNavbarLinks() {
  const navbarLinks = document.getElementById('navbar-links');
  if (!navbarLinks) return;

  const path = window.location.pathname;
  const user = getLoggedUser();

  if (!user) {
    navbarLinks.innerHTML = `
    
      <li class="nav-item">
        <a class="nav-link" href="/login.html">
          <i class="bi bi-person-circle"></i>
          Login
        </a>
      </li>
    `;
    return;
  }

  const allLinks = [
    { name: 'Home', href: '/index.html', icon: 'bi-house-door' },
    { name: 'Destinos', href: '/admin/destinations.html', icon: 'bi-geo-alt', roles: ['passenger'] },
    { name: 'Corridas', href: '/corridas.html', icon: 'bi-flag' },
    { name: 'Status da Corrida', href: '/motorista/statusCorrida.html', icon: 'bi-flag-checkered', roles: ['driver'] },
    { name: 'Veículos', href: '/veiculos/index.html', icon: 'bi-truck', roles: ['driver'] },
    { name: 'Histórico', href: '/historico/travelHistory.html', icon: 'bi-clock-history' },
    { name: 'Resumo', href: '/resumo/rideSummary.html', icon: 'bi-clipboard-data' },
  ];

  const links = filterNavbarLinks(allLinks);

  navbarLinks.innerHTML = '';
  links.forEach(link => {
    const li = document.createElement('li');
    li.classList.add('nav-item');
    const isActive = path.endsWith(link.href) || path === link.href;
    li.innerHTML = `<a class="nav-link${isActive ? ' active fw-bold text-primary' : ''}" href="${link.href}">
      <i class="bi ${link.icon} me-1"></i> ${link.name}
    </a>`;
    navbarLinks.appendChild(li);
  });

  addLogoutButton();
}

document.addEventListener('DOMContentLoaded', function() {
  renderNavbarLinks();
  applyModernClasses();

  const path = window.location.pathname;
  const isAuthPage = /login\.html$|register\.html$/i.test(path);
  if (!isAuthPage && document.querySelector('.container')) {
    if (!document.querySelector('.page-header')) {
      let title = '';
      let subtitle = '';
      if (path.includes('destinations')) {
        title = 'Gerenciar Destinos';
        subtitle = 'Crie e gerencie seus destinos favoritos para compartilhar caronas';
      } else if (path.includes('corridas')) {
        title = 'Corridas';
        subtitle = 'Veja e gerencie solicitações de carona';
      } else if (path.includes('caronas')) {
        title = 'Caronas Disponíveis';
        subtitle = 'Encontre e solicite caronas para suas viagens';
      } else if (path.includes('veiculos')) {
        title = 'Gerenciar Veículos';
        subtitle = 'Gerencie seus veículos para compartilhar caronas';
      } else if (path.includes('create')) {
        title = 'Criar Veículo';
        subtitle = 'Crie um novo veículo para compartilhar caronas';
      } else if (path.includes('travelHistory')) {
        title = 'Histórico de Viagens';
        subtitle = 'Acompanhe todas as suas viagens e estatísticas';
      } else if (path.includes('rides')) {
        title = 'Minhas Corridas';
        subtitle = 'Gerencie e acompanhe suas corridas';
      } else if (path.includes('rideSummary')) {
        title = 'Resumo da Carona';
        subtitle = 'Acompanhe todas as suas viagens e estatísticas';
      } else if (path.includes('statusCorrida')) {
        title = 'Status da Corrida';
        subtitle = 'Gerencie suas solicitações de carona';
      }
      createPageHeader(title, subtitle);
    }
  }
});
