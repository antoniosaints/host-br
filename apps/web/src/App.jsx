import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from './api.js';

const AuthContext = createContext(null);

const statusLabels = {
  checkout_pending: 'Aguardando pagamento',
  paid: 'Pago'
};

const platformHighlights = [
  {
    title: 'Baixa latência no Brasil',
    text: 'Infraestrutura indicada para sites, lojas virtuais, sistemas internos e APIs que atendem usuários no país.'
  },
  {
    title: 'Armazenamento NVMe',
    text: 'Discos de alta velocidade para reduzir gargalos em bancos de dados, painéis administrativos e aplicações dinâmicas.'
  },
  {
    title: 'Suporte na migração',
    text: 'A migração gratuita ajuda a tirar seu projeto do provedor antigo com menos risco e menos tempo parado.'
  }
];

const workflowSteps = [
  {
    label: '01',
    title: 'Escolha o plano',
    text: 'Compare CPU, memória e armazenamento conforme o tamanho do seu projeto.'
  },
  {
    label: '02',
    title: 'Informe seus dados',
    text: 'Crie sua conta para manter seus pedidos, pagamentos e comprovantes organizados.'
  },
  {
    label: '03',
    title: 'Pagamento seguro',
    text: 'Finalize a contratação em ambiente seguro, com cobrança mensal do plano escolhido.'
  },
  {
    label: '04',
    title: 'Acompanhe sua VPS',
    text: 'Consulte suas compras e o status do serviço diretamente pela área do cliente.'
  }
];

const faqItems = [
  {
    question: 'Em quanto tempo minha VPS fica disponível?',
    answer:
      'A ativação é iniciada após a confirmação do pagamento. Em planos padrão, a liberação costuma ocorrer em horário comercial com validação dos dados da conta.'
  },
  {
    question: 'A migração gratuita está inclusa?',
    answer:
      'Sim. A migração gratuita cobre a transferência inicial do seu ambiente quando os acessos do provedor anterior estão disponíveis e a aplicação é compatível.'
  },
  {
    question: 'Posso hospedar sites, sistemas e APIs?',
    answer:
      'Sim. Os planos VPS sao indicados para projetos que precisam de mais controle que uma hospedagem compartilhada, incluindo sites, e-commerces, ERPs, CRMs e APIs.'
  },
  {
    question: 'O cPanel está incluso no plano?',
    answer:
      'Os planos informam cPanel disponível. A contratação da licença ou ativação do painel pode depender da configuração escolhida no atendimento comercial.'
  },
  {
    question: 'Consigo trocar para um plano maior depois?',
    answer:
      'Sim. Quando seu projeto crescer, a equipe pode orientar o upgrade para mais CPU, memória ou armazenamento com o menor impacto possível.'
  },
  {
    question: 'O que significa ter IP dedicado?',
    answer:
      'O IP dedicado separa seu servidor de outros clientes e facilita configurações de DNS, certificados, reputação de e-mail e regras de acesso.'
  }
];

function formatCurrency(cents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100);
}

function formatCardPrice(cents) {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      async login(payload) {
        const data = await api.login(payload);
        setUser(data.user);
        return data.user;
      },
      async register(payload) {
        const data = await api.register(payload);
        setUser(data.user);
        return data.user;
      },
      async logout() {
        await api.logout();
        setUser(null);
      }
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function usePlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .plans()
      .then((data) => setPlans(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { plans, loading, error };
}

export default function App() {
  return (
    <AuthProvider>
      <Shell>
        <Routes>
          <Route path="/" element={<PlansPage />} />
          <Route path="/checkout/:planId" element={<CheckoutPage />} />
          <Route path="/checkout/sucesso" element={<CheckoutSuccessPage />} />
          <Route path="/checkout/cancelado" element={<CheckoutCancelPage />} />
          <Route path="/cliente" element={<ClientAreaPage />} />
        </Routes>
      </Shell>
    </AuthProvider>
  );
}

function Shell({ children }) {
  const auth = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Hostbr início">
          <span className="brand-mark">Hb</span>
          <span>Hostbr</span>
        </Link>
        <nav className="nav-links" aria-label="Navegação principal">
          <NavLink to="/">Planos</NavLink>
          <a href="/#infra">Infraestrutura</a>
          <a href="/#faq">FAQ</a>
          <NavLink to="/cliente">Área do cliente</NavLink>
          {auth.user ? <span className="nav-user">{auth.user.name}</span> : null}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}

function PlansPage() {
  const { plans, loading, error } = usePlans();

  return (
    <section className="plans-stage">
      <div className="plans-heading">
        <div className="hero-kicker">
          <span>NVMe no Brasil</span>
          <span>IP dedicado</span>
          <span>Migração gratuita</span>
        </div>
        <h1>Escolha a configuração ideal para seu VPS</h1>
        <p className="hero-copy">
          Servidores virtuais para projetos que precisam de velocidade, estabilidade e liberdade para configurar
          sites, sistemas, lojas virtuais e APIs com mais controle.
        </p>
        <div className="plan-toggle" aria-label="Tipo de desempenho">
          <span className="active">Desempenho padrão</span>
          <span>Alto desempenho</span>
        </div>
      </div>

      {loading ? <p className="state-text">Carregando planos...</p> : null}
      {error ? <p className="state-text error">{error}</p> : null}

      <div className="plans-grid">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      <TrustMetrics />

      <div className="infra-strip" id="infra">
        <div>
          <strong>Cloud NVMe no Brasil</strong>
          <span>
            Hospede seu projeto em VPS com armazenamento rápido, transferência ilimitada, IP dedicado e suporte
            para migração inicial.
          </span>
        </div>
      </div>

      <PlatformSection />
      <PlanComparison plans={plans} />
      <WorkflowSection />
      <FaqSection />
    </section>
  );
}

function PlanCard({ plan }) {
  const isRecommended = plan.ctaVariant === 'yellow';

  return (
    <article className={`plan-card ${plan.badge ? 'has-badge' : ''} ${isRecommended ? 'recommended' : ''}`}>
      {plan.badge ? <div className="plan-badge">{plan.badge}</div> : null}

      <div className="plan-content">
        <h2>{plan.name}</h2>
        <div className="price-line">
          <span className="currency">R$</span>
          <span className="amount">{formatCardPrice(plan.monthlyPriceCents)}</span>
          <span className="period">/mês</span>
        </div>

        <Link className={`choose-button ${isRecommended ? 'yellow' : ''}`} to={`/checkout/${plan.id}`}>
          Escolher plano
        </Link>

        <a className="talk-link" href="mailto:vendas@hostbr.local">
          ou fale com a gente
        </a>

        <ul className="feature-list">
          {plan.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function TrustMetrics() {
  return (
    <section className="metrics-grid" aria-label="Resumo da plataforma Hostbr">
      <article>
        <span>Performance</span>
        <strong>Discos NVMe</strong>
        <p>Leitura e gravação rápidas para aplicações, bancos de dados e painéis de controle.</p>
      </article>
      <article>
        <span>Rede</span>
        <strong>Brasil</strong>
        <p>Infraestrutura orientada para menor latência em projetos com público nacional.</p>
      </article>
      <article>
        <span>Suporte</span>
        <strong>Migração grátis</strong>
        <p>Apoio na transferência inicial para reduzir riscos na troca de hospedagem.</p>
      </article>
    </section>
  );
}

function PlatformSection() {
  return (
    <section className="content-section split-section">
      <div>
        <p className="eyebrow">Infraestrutura VPS</p>
        <h2>Mais controle para projetos que não cabem na hospedagem compartilhada.</h2>
        <p>
          A Hostbr oferece VPS NVMe para empresas, desenvolvedores e operações que precisam de recursos
          dedicados, acesso flexível e ambiente preparado para crescimento. Você escolhe o plano conforme
          o uso atual e pode evoluir quando o projeto exigir mais capacidade.
        </p>
      </div>

      <div className="highlight-stack">
        {platformHighlights.map((item) => (
          <article key={item.title}>
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlanComparison({ plans }) {
  if (plans.length === 0) {
    return null;
  }

  return (
    <section className="content-section comparison-section" aria-labelledby="comparison-title">
      <div className="section-heading">
        <p className="eyebrow">Comparativo técnico</p>
        <h2 id="comparison-title">Veja os recursos lado a lado</h2>
      </div>

      <div className="comparison-table" role="table" aria-label="Comparativo dos planos VPS">
        <div className="comparison-row header" role="row">
          <span role="columnheader">Plano</span>
          <span role="columnheader">CPU</span>
          <span role="columnheader">RAM</span>
          <span role="columnheader">NVMe</span>
          <span role="columnheader">Mensalidade</span>
        </div>
        {plans.map((plan) => (
          <div className="comparison-row" role="row" key={plan.id}>
            <strong role="cell">{plan.name}</strong>
            <span role="cell">{plan.vcpu} vCPU</span>
            <span role="cell">{plan.ramGb} GB DDR5</span>
            <span role="cell">{plan.storageGb} GB</span>
            <span role="cell">{formatCurrency(plan.monthlyPriceCents)}/mês</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="content-section workflow-section">
      <div className="section-heading">
        <p className="eyebrow">Fluxo de compra</p>
        <h2>Contratação simples, com acompanhamento pelo cliente</h2>
      </div>

      <div className="workflow-grid">
        {workflowSteps.map((step) => (
          <article key={step.label}>
            <span>{step.label}</span>
            <strong>{step.title}</strong>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="content-section faq-section" id="faq">
      <div className="section-heading">
        <p className="eyebrow">Perguntas frequentes</p>
        <h2>Informações rápidas antes de contratar</h2>
      </div>

      <div className="faq-list">
        {faqItems.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function CheckoutPage() {
  const { planId } = useParams();
  const { plans, loading, error } = usePlans();
  const auth = useAuth();
  const [checkoutError, setCheckoutError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const plan = plans.find((item) => item.id === planId);

  async function startCheckout() {
    setCheckoutError('');
    setSubmitting(true);

    try {
      const data = await api.createCheckoutSession(plan.id);
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || auth.loading) {
    return <p className="state-text page-state">Carregando checkout...</p>;
  }

  if (error || !plan) {
    return <p className="state-text page-state error">{error || 'Plano não encontrado.'}</p>;
  }

  return (
    <section className="checkout-layout">
      <div className="checkout-main">
        <p className="eyebrow">Checkout Hostbr</p>
        <h1>Finalize seu {plan.name}</h1>
        <p className="checkout-copy">
          Revise o plano escolhido e avance para o ambiente seguro de pagamento. Depois da confirmação,
          a compra aparece na sua área do cliente.
        </p>

        {auth.user ? (
          <div className="checkout-action">
            <div>
              <span className="muted-label">Cliente</span>
              <strong>{auth.user.name}</strong>
              <small>{auth.user.email}</small>
            </div>
            <button className="primary-action" type="button" onClick={startCheckout} disabled={submitting}>
              {submitting ? 'Abrindo pagamento...' : 'Continuar para pagamento'}
            </button>
            {checkoutError ? <p className="form-error">{checkoutError}</p> : null}
          </div>
        ) : (
          <AuthPanel onSuccess={() => setCheckoutError('')} />
        )}
      </div>

      <aside className="summary-panel" aria-label="Resumo do plano">
        <span className="summary-badge">{plan.badge || 'Plano VPS'}</span>
        <h2>{plan.name}</h2>
        <strong>{formatCurrency(plan.monthlyPriceCents)}/mês</strong>
        <ul className="feature-list compact">
          {plan.features.slice(0, 5).map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </aside>
    </section>
  );
}

function AuthPanel({ onSuccess }) {
  const auth = useAuth();
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'register') {
        await auth.register(form);
      } else {
        await auth.login({ email: form.email, password: form.password });
      }

      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-panel" onSubmit={submit}>
      <div className="auth-tabs">
        <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
          Criar conta
        </button>
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          Entrar
        </button>
      </div>

      {mode === 'register' ? (
        <label>
          Nome
          <input name="name" value={form.name} onChange={updateField} autoComplete="name" />
        </label>
      ) : null}

      <label>
        E-mail
        <input name="email" type="email" value={form.email} onChange={updateField} autoComplete="email" />
      </label>

      <label>
        Senha
        <input
          name="password"
          type="password"
          value={form.password}
          onChange={updateField}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-action" type="submit" disabled={submitting}>
        {submitting ? 'Enviando...' : mode === 'register' ? 'Criar login' : 'Entrar'}
      </button>
    </form>
  );
}

function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const auth = useAuth();
  const [state, setState] = useState({ loading: true, message: '', order: null });
  const sessionId = params.get('session_id');

  useEffect(() => {
    if (auth.loading) {
      return;
    }

    if (!sessionId) {
      setState({ loading: false, message: 'Sessão de checkout não informada.', order: null });
      return;
    }

    if (!auth.user) {
      setState({ loading: false, message: 'Entre na sua conta para sincronizar a compra.', order: null });
      return;
    }

    api
      .syncCheckoutSession(sessionId)
      .then((data) => setState({ loading: false, message: 'Pagamento sincronizado.', order: data.order }))
      .catch((err) => setState({ loading: false, message: err.message, order: null }));
  }, [auth.loading, auth.user, sessionId]);

  return (
    <section className="result-page">
      <p className="eyebrow">Checkout</p>
      <h1>Compra recebida</h1>
      <p>{state.loading ? 'Sincronizando pagamento...' : state.message}</p>
      {state.order ? (
        <div className="result-order">
          <strong>{state.order.planName}</strong>
          <span>{statusLabels[state.order.status] || state.order.status}</span>
        </div>
      ) : null}
      <Link className="primary-link" to="/cliente">
        Ir para área do cliente
      </Link>
    </section>
  );
}

function CheckoutCancelPage() {
  const [params] = useSearchParams();
  const planId = params.get('plan');

  return (
    <section className="result-page">
      <p className="eyebrow">Checkout</p>
      <h1>Pagamento cancelado</h1>
      <p>Nenhuma compra foi confirmada.</p>
      <Link className="primary-link" to={planId ? `/checkout/${planId}` : '/'}>
        Voltar ao checkout
      </Link>
    </section>
  );
}

function ClientAreaPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth.user) {
      return;
    }

    setLoadingOrders(true);
    api
      .orders()
      .then((data) => setOrders(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoadingOrders(false));
  }, [auth.user]);

  async function logout() {
    await auth.logout();
    navigate('/');
  }

  if (auth.loading) {
    return <p className="state-text page-state">Carregando área do cliente...</p>;
  }

  if (!auth.user) {
    return (
      <section className="client-layout single">
        <div className="checkout-main">
          <p className="eyebrow">Área do cliente</p>
          <h1>Acesse suas compras</h1>
          <AuthPanel />
        </div>
      </section>
    );
  }

  return (
    <section className="client-layout">
      <div className="client-header">
        <div>
          <p className="eyebrow">Área do cliente</p>
          <h1>Minhas compras</h1>
          <span>{auth.user.email}</span>
        </div>
        <button className="secondary-action" type="button" onClick={logout}>
          Sair
        </button>
      </div>

      {loadingOrders ? <p className="state-text">Carregando compras...</p> : null}
      {error ? <p className="state-text error">{error}</p> : null}

      <div className="orders-list">
        {!loadingOrders && orders.length === 0 ? (
          <div className="empty-state">
            <strong>Nenhuma compra ainda</strong>
            <Link to="/">Escolher um plano VPS</Link>
          </div>
        ) : null}

        {orders.map((order) => (
          <article className="order-row" key={order.id}>
            <div>
              <strong>{order.planName}</strong>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            <div>
              <strong>{formatCurrency(order.amountCents)}/mês</strong>
              <span className={`status-pill ${order.status}`}>{statusLabels[order.status] || order.status}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
