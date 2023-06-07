import { useEffect, useState } from 'react';
import { ethers } from 'ethers'; // connects project to the blockchain

// Components
import Navigation from './components/Navigation';
import Search from './components/Search';
import Home from './components/Home';

// ABIs
import RealEstate from './abis/RealEstate.json'
import Escrow from './abis/Escrow.json'

// Config
import config from './config.json';

function App() {

  // set variables across web app
  const [escrow, setEscrow] = useState(null) // allow an escrow smartcontract for each sale
  const [provider, setProvider] = useState(null) // allow multiple wallets
  const [account, setAccount] = useState(null) // read and set address state of metamask account
  const [realties, setRealties] = useState([])  // read and set current nft set (useful if more than one RealEstate smart contract)
  const [realty, setRealty] = useState({})  // read and set current nft for ez viewing
  const [toggle, setToggle] = useState(false) // create a savable toggle switch

  // plug web app into blockchain
  const loadBLockchainData = async () => {
    const provider = ((window.ethereum != null) ? new ethers.providers.Web3Provider(window.ethereum)  : ethers.providers.getDefaultProvider()); // checks and connects metamask window
    setProvider(provider)
    console.log(`Current wallet provider: `)
    console.log(provider)

    const network = await provider.getNetwork() // get network ChainId

    // grab js object version of real estate smartcontract using address from config file, abi, and provider
    const realEstate = new ethers.Contract(config[network.chainId].realEstate.address, RealEstate, provider)
    
    // grab a quality from this js smartcontract object:
    // (in this case total supply)
    const totalSupply = await realEstate.totalSupply()
    console.log(`Total number of properties: ${totalSupply.toString()}`)

    // grab each nftId in the nft smartcontract (1 for each property)
    const realties = [] // stores all nfts with metadata
    for (var i = 1; i <= totalSupply; i++) {
      const uri = await realEstate.tokenURI(i) // takes nftId and converts to address where metadata is stored
      const response = await fetch(uri) // calls address where metadata is stored
      const metadata = await response.json() // grabs the metadata as json
      realties.push(metadata) // populates array with all nfts and metadata
    }
    setRealties(realties) // set NFT collection
    console.log(`List of properties: `)
    console.log(realties)

    // grab js object version of escrow smartcontract using address from config file, abi, and provider
    const escrow = new ethers.Contract(config[network.chainId].escrow.address, Escrow, provider)
    setEscrow(escrow) // set current escrow smart contract

    
    window.ethereum.on('accountsChanged', async () => { // when user changes their account in metamask
      const accounts = await window.ethereum.request({method: 'eth_requestAccounts'}) // get the account list
      const account = ethers.utils.getAddress(accounts[0]) // grab the current metamask account
      setAccount(account) // set the metamask account
      console.log(`Current address: ${account}`)
    })
  }

  useEffect(() => {
    loadBLockchainData() // calls blockchain loader for React frontend
  }, [])

  const togglePopup = (realty) => { // button for new page
    setRealty(realty)
    toggle ? setToggle(false) : setToggle(true) // toglle switching logic
    console.log(`Current property: `)
    console.log(realty)
  }

  return ( // React lets u mix JS and HTML in the same place
    <div>

      <Navigation account={account} setAccount={setAccount} /> {/* Passes ETH address into navbar component */}

      <Search />

      <div className='cards__section'>

        <h3>Homes For You</h3>

        <hr />

        <div className='cards'>
          {realties?.map((realty, index) => (

            <div className = 'card' key={index} onClick={() => togglePopup(realty)}> {/* Lets u select a realty */}
              <div className = 'card__image'>
                <img src={realty.image} alt="Home"/>
              </div>
              <div className='card__info'>
                <h4>{realty.attributes[0].value} ETH</h4>
                <p>
                  <strong>{realty.attributes[2].value}</strong> beds |
                  <strong>{realty.attributes[3].value}</strong> bath |
                  <strong>{realty.attributes[4].value}</strong> sqft
                </p>
                <p>{realty.address}</p>
              </div>
            </div>

          )
          )}
        </div>
      </div>
      
      {toggle && (
        <Home realty={realty} provider={provider} account={account} escrow={escrow} togglePopup={togglePopup}/>
      )} {/* Pops up a new react element */}

    </div>
  );
}

export default App;
