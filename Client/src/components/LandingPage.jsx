import React, { useState, useEffect } from 'react'
import './LandingPage.css'

const LandingPage = () => {
  const [showGetBetterPrice, setShowGetBetterPrice] = useState(false)
  const [showCreateAlert, setShowCreateAlert] = useState(false)
  const [priceOptions, setPriceOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPrice, setCurrentPrice] = useState('Rs. 1860')

  // modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('Buy') // 'Buy' | 'Sell'
  const [modalSource, setModalSource] = useState(null) // optional source name

  // mobile menu state
  const [mobileOpen, setMobileOpen] = useState(false)

  const backend_url = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchPriceOptions = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${backend_url}/api/NSE%20India`)
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Transform backend response into price options
        const stocks = []
        let minPrice = Infinity
        let minPriceFormatted = 'Rs. 1860'
        
        if (data.sharesCart?.status === 'FOUND') {
          stocks.push({
            id: 1,
            name: 'ShareCart',
            price: `Rs. ${data.sharesCart.data.lastTradedPrice}`,
            priceValue: parseFloat(data.sharesCart.data.lastTradedPrice.replace(/,/g, '')),
            source: 'ShareCart',
            url: data.sharesCart.data.sourceUrl
          })
        }
        
        if (data.wwipl?.status === 'FOUND') {
          stocks.push({
            id: 2,
            name: 'WWIPL',
            price: `Rs. ${data.wwipl.data.lastTradedPrice}`,
            priceValue: parseFloat(data.wwipl.data.lastTradedPrice.replace(/,/g, '')),
            source: 'WWIPL',
            url: data.wwipl.data.sourceUrl
          })
        }
        
        // Add more sources if they exist in the response
        const sourceKeys = Object.keys(data).filter(
          key => key !== 'query' && key !== 'timestamp' && key !== 'summary' && key !== 'sharesCart' && key !== 'wwipl'
        )
        
        sourceKeys.forEach((key, idx) => {
          if (data[key]?.status === 'FOUND' && data[key]?.data) {
            stocks.push({
              id: stocks.length + 1,
              name: key.charAt(0).toUpperCase() + key.slice(1),
              price: `Rs. ${data[key].data.lastTradedPrice}`,
              priceValue: parseFloat(data[key].data.lastTradedPrice.replace(/,/g, '')),
              source: key,
              url: data[key].data.sourceUrl
            })
          }
        })
        
        // Find the smallest price
        if (stocks.length > 0) {
          const smallestStock = stocks.reduce((min, stock) => 
            stock.priceValue < min.priceValue ? stock : min
          )
          minPriceFormatted = smallestStock.price
          setCurrentPrice(minPriceFormatted)
        }
        
        setPriceOptions(stocks)
        setError(null)
      } catch (err) {
        setError(err.message)
        console.error('Error fetching price options:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPriceOptions()
  }, [])

  const openModal = (type = 'Buy', source = null) => {
    setModalType(type)
    setModalSource(source)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalSource(null)
  }

  const handleModalSubmit = (e) => {
    e.preventDefault()
    // simple UX: close modal. Replace with actual submit logic as needed.
    closeModal()
  }

  // add helper above return()
  const renderStockGrid = () => {
    if (loading) return <p>Loading prices from different sources...</p>
    if (error) return <p className="error-message">Error: {error}</p>
    if (!priceOptions || priceOptions.length === 0) return <p>No price data available</p>

    return priceOptions.map((stock) => (
      <div key={stock.id} className="stock-card">
        <h3 className="stock-name">{stock.name}</h3>
        <p className="stock-price">{stock.price}</p>
        <button
          type="button"
          className="btn btn-stock"
          onClick={() => openModal('Buy', stock.source)}
        >
          Continue
        </button>
        <small className="stock-hint">
          Set a better price to{' '}
          <button type="button" className="btn-inline" onClick={() => openModal('Buy', stock.source)}>
            Buy
          </button>{' '}
          or{' '}
          <button type="button" className="btn-inline" onClick={() => openModal('Sell', stock.source)}>
            Sell
          </button>
        </small>
      </div>
    ))
  }

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="header">
        <div className="logo">Stake</div>

        {/* mobile hamburger toggle (visible on small screens) */}
        <button
          type="button"
          className="mobile-toggle"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(prev => !prev)}
        >
          <span className="hamburger" />
        </button>

        <nav className={`nav ${mobileOpen ? 'open' : ''}`}>
          <a href="#home" onClick={() => setMobileOpen(false)}>Home</a>
          <a href="#about" onClick={() => setMobileOpen(false)}>About</a>
          <a href="#offerings" onClick={() => setMobileOpen(false)}>Offerings</a>
          <a href="#listings" onClick={() => setMobileOpen(false)}>Listings</a>
          <a href="#blog" onClick={() => setMobileOpen(false)}>Blog</a>
          <a href="#privacy" onClick={() => setMobileOpen(false)}>Privacy Policy</a>
          <a href="#terms" onClick={() => setMobileOpen(false)}>Terms & Conditions</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="price-header">
          <h1 className="current-price">{currentPrice}</h1>
          <p className="price-label">NSE India Unlisted Stock Price</p>
        </div>
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={() => openModal('Buy', null)}>Buy</button>
          <button className="btn btn-secondary" onClick={() => openModal('Sell', null)}>Sell</button>
          <div className="btn btn-outline">
            Set a better price to
            <button className="btn-inline" onClick={() => openModal('Buy', null)}>Buy</button>
            or
            <button className="btn-inline" onClick={() => openModal('Sell', null)}>Sell</button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="content-wrapper">
        {/* Left Section - Stock Grid */}
        <section className="stock-grid-section">
          <div className="stock-grid">
            {renderStockGrid()}
          </div>
        </section>

        {/* Right Section - Forms */}
        <section className="forms-section">
          {/* Create Alert Form (kept on page) */}
          <div className="form-card">
            <h2>Create Alert</h2>
            <form>
              <div className="form-group">
                <label>Target Price</label>
                <input type="number" placeholder="(Required)" />
              </div>
              <div className="form-group">
                <label>Your Email</label>
                <input type="email" placeholder="(Required)" />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                Create Alert
              </button>
            </form>
          </div>
        </section>
      </div>

      {/* Modal */}
      {modalOpen && (
        <>
          <div className="modal-backdrop" onClick={closeModal} />
          <div className="modal" role="dialog" aria-modal="true" aria-label={`${modalType} modal`}>
            <div className="modal-header">
              <h3>{modalType} — {modalSource ? modalSource : 'NSE India'}</h3>
              <button className="modal-close" onClick={closeModal} aria-label="Close">×</button>
            </div>

            {/* Show the full "Get a better Price?" form when modalType is Buy or Sell */}
            { (modalType === 'Buy' || modalType === 'Sell') ? (
              <form className="modal-body" onSubmit={handleModalSubmit}>
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" placeholder="(Required)" required />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input type="tel" placeholder="(Optional)" />
                </div>
                <div className="form-group">
                  <label>Your Email</label>
                  <input type="email" placeholder="(Required)" required />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-block">
                    Click to get the best rate
                  </button>
                </div>
              </form>
            ) : (
              // fallback / other modal types keep existing simple form
              <form className="modal-body" onSubmit={handleModalSubmit}>
                <div className="form-group">
                  <label>Your Name</label>
                  <input type="text" required />
                </div>
                <div className="form-group">
                  <label>Your Email</label>
                  <input type="email" required />
                </div>
                <div className="form-group">
                  <label>Phone (optional)</label>
                  <input type="tel" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit {modalType}</button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default LandingPage