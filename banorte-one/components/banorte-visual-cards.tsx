const slides = [
  {
    image: '/banking-illustration.jpeg',
    eyebrow: 'BANCA DIGITAL',
    title: 'Todo lo que necesitas, en un solo lugar.',
    description: 'Consulta, paga y transfiere con una experiencia pensada para ti.',
  },
  {
    image: '/community-finance.jpeg',
    eyebrow: 'ACOMPAÑAMIENTO',
    title: 'Tus decisiones financieras, más claras.',
    description: 'Conoce tus opciones y conversa con Maya cuando necesites orientación.',
  },
  {
    image: '/security-illustration.jpeg',
    eyebrow: 'SEGURIDAD BANORTE',
    title: 'Tu dinero, siempre protegido.',
    description: 'Diseñamos cada interacción para que operes con tranquilidad.',
  },
]

export function BanorteVisualCards() {
  return (
    <section className="visual-showcase" aria-label="Beneficios de la banca digital">
      {slides.map((slide) => (
        <article className="visual-card" key={slide.eyebrow}>
          <div className="visual-image-wrap">
            <img src={slide.image} alt={slide.title} className="visual-image" />
          </div>
          <div className="visual-copy">
            <span className="eyebrow">{slide.eyebrow}</span>
            <h2>{slide.title}</h2>
            <p>{slide.description}</p>
          </div>
        </article>
      ))}
    </section>
  )
}
