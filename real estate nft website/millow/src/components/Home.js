import { ethers } from 'ethers';
import { useEffect, useState } from 'react';

import close from '../assets/close.svg';

const Home = ({ realty, provider, account, escrow, togglePopup }) => {

    // set React component states
    const [buyer, setBuyer] = useState(null)
    const [lender, setLender] = useState(null)
    const [inspector, setInspector] = useState(null)
    const [seller, setSeller] = useState(null)

    const [hasBought, setHasBought] = useState(false)
    const [hasLended, setHasLended] = useState(false)
    const [hasInspected, setHasInspected] = useState(false)
    const [hasSold, setHasSold] = useState(false)

    const [owner, setOwner] = useState(null)

    const fetchDetails = async () => { // get contract details
        const buyer = await escrow.buyer(realty.id) // gets eth address of the buyer from escrow .js object
        setBuyer(buyer)

        const lender = await escrow.lender() // gets eth address of the lender from escrow .js object
        setLender(lender)

        const inspector = await escrow.inspector() // gets eth address of the inspector from escrow .js object
        setInspector(inspector)

        const seller = await escrow.seller() // gets eth address of the seller from escrow .js object
        setSeller(seller)

        const hasBought = await escrow.approved(realty.id, buyer) // gets the state of contract approval of the buyer from escrow .js object
        setHasBought(hasBought)

        const hasLended = await escrow.approved(realty.id, lender) // gets the state of contract approval of the lender from escrow .js object
        setHasLended(hasLended)

        const hasInspected = await escrow.inspectionPassed(realty.id) // gets the state of contract approval of the inspector from escrow .js object
        setHasInspected(hasInspected)

        const hasSold = await escrow.approved(realty.id, seller) // gets the state of contract approval of the seller from escrow .js object
        setHasSold(hasSold)
    }

    const fetchOwner = async () => { // gets the contract owner

        if (await escrow.isListed(realty.id)) return // if it is listed
            const owner = await escrow.buyer(realty.id) // listen for the buyer and make react display the buyer as the owner 
            setOwner(owner)
    }

    const buyHandler = async () => { // call escrow smartcontract to buy on click
        const escrowAmount = await escrow.escrowAmount(realty.id) // grab the amount of escrow asked for
        const signer = await provider.getSigner() // grab the current address loaded in metamask

        // These only work for Hardhat #0 in metamask (the buyer sig)

        // Approve to buy
        let transaction = await escrow.connect(signer).approveSale(realty.id)
        await transaction.wait()

        // Fund down payment
        transaction = await escrow.connect(signer).depositDownPayment(realty.id, {value: escrowAmount})
        await transaction.wait()

        // Get new state of smart contract as a check
        fetchDetails()
        setHasBought(hasBought)
    }

    const lendHandler = async () => { // call escrow smartcontract to lend on click
        const escrowAmount = await escrow.escrowAmount(realty.id) // grab the amount of escrow asked for
        const purchasePrice = await escrow.purchasePrice(realty.id)  // grab the amount of loan asked for
        const signer = await provider.getSigner() // grab the current address loaded in metamask

        // Approve to lend
        const transaction = await escrow.connect(signer).approveSale(realty.id)
        await transaction.wait()

        // Fund load
        const lendAmount = purchasePrice - escrowAmount
        await signer.sendTransaction({ to: escrow.address, value: lendAmount.toString(), gasLimit: 60000 })

        // Get new state of smart contract as a check
        fetchDetails()
        setHasLended(hasLended)
    }

    const inspectHandler = async () => { // call escrow smartcontract to inspect on click
        const signer = await provider.getSigner() // grab the current address loaded in metamask

        // Inspect
        const transaction = await escrow.connect(signer).updateInspectionStatus(realty.id, true)
        await transaction.wait()

        // Get new state of smart contract as a check
        fetchDetails()
        setHasInspected(hasInspected)
    }

    const sellHandler = async () => { // call escrow smartcontract to sell on click
        const signer = await provider.getSigner() // grab the current address loaded in metamask
        
        // Approve to sell
        let transaction = await escrow.connect(signer).approveSale(realty.id)
        await transaction.wait()

        // Final seller signature
        transaction = await escrow.connect(signer).finalizeSale(realty.id)
        await transaction.wait()

        // Get new state of smart contract as a check
        fetchDetails()
        setHasSold(hasSold)
    }


    useEffect(() => { // react checks for changes: once sold, remove frontend ability to buy, sell, inspect, or lend
        fetchDetails()
        fetchOwner()
    }, [hasSold])

    return (
        <div className="home" onClick={() => togglePopup(realty)}>
            <div className="home__details">

                <div className="home__image" style={{"grid-area": "home__image"}}>
                    <img src={realty.image} alt="Home" />
                </div>

                <div className="home__overview" style={{"grid-area": "home__overview", "overflow-y": "clip"}}>
                    <h1>{realty.name}</h1>
                    <p>
                        <strong>{realty.attributes[2].value}</strong> beds |
                        <strong>{realty.attributes[3].value}</strong> bath |
                        <strong>{realty.attributes[4].value}</strong> sqft
                    </p>
                    <p>{realty.address}</p>
                </div>

                <div style={{"grid-area": "home__buy","margin": "auto","height":"100px"}}>
                    <h2 style={{"text-align": "center"}}>{realty.attributes[0].value} ETH</h2>
                    
                    {owner ? ( // If the property been sold display this:
                        <div className='home__owned'>
                            Owned by {owner.slice(0, 6) + '...' + owner.slice(38, 42)}
                        </div>
                    ) : ( 
                        <div>
                            {   (account === inspector) ? ( // Detect inspector address ("hardhat #2") loaded in metamask
                                <button className="home__buy" onClick={inspectHandler} disabled={hasInspected}>
                                    {hasInspected ? "Inspection Approved" : "Approve Inspection"}
                                </button>
                            ) : (account === lender) ? ( // Detect lender address ("hardhat #3") loaded in metamask
                                <div>
                                    <button className="home__buy" onClick={lendHandler} disabled={hasLended}>
                                        {hasLended ? "Loan Approved" : "Approve & Lend"}
                                    </button>
                                    <h6 style={{"text-align": "center","margin":"-15px"}}>Loan Value: {realty.attributes[0].value * 0.9} ETH</h6>
                                </div>
                            ) : (account === seller) ? ( // Detect seller address ("hardhat #1") loaded in metamask
                                <button className="home__buy" onClick={sellHandler} disabled={hasSold}>
                                    {hasSold ? "Sale Approved" : "Approve & Sell"} 
                                </button>
                            ) : ( // Detect any other address
                                <div>
                                    <button className="home__buy" onClick={buyHandler} disabled={hasBought}>
                                        {hasBought ? "Purchase Approved" : "Buy"}
                                    </button>
                                    <h6 style={{"text-align": "center","margin":"-15px"}}>Down Payment: {realty.attributes[0].value * 0.1} ETH</h6>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={{"grid-area": "home__contact","margin": "auto","height":"80px"}}>
                    <button className="home__contact" onClick={false} disabled={hasBought}>
                        Contact Agent
                    </button>
                </div>

                <div style={{"grid-area": "home__description"}}>
                    <hr />
                    <h2>Overview</h2>
                    <p style={{"margin-left": "10px","margin-top":"5px"}}>{realty.description}</p>
                </div>

                <div style={{"grid-area": "home__features"}}>
                    <hr />
                    <h2>Facts and Features</h2>
                    <ul style={{"margin-left": "30px"}}>
                        {realty.attributes.map((attribute, index) => (
                            <li key={index}><strong>{attribute.trait_type}</strong> : {attribute.value}</li>
                        ))}
                    </ul>
                </div>

                <button className ="home__close"></button>
            </div>
        </div>
    );
}

export default Home;
