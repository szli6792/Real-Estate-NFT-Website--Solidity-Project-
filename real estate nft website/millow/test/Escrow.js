const { expect } = require('chai'); // assertion library
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether') //helper that converts currency to tokens
}

describe('Escrow', () => {     // tests go here

    let buyer, seller, inspector, lender // save variables inside tests
    let realEstate // save variables inside tests

    beforeEach(async () => { // code that runs before tests
        
        [buyer, seller, inspector, lender] = await ethers.getSigners() // get 20 different test metamask account addresses from hardhat

        // Deploy RealEstate.sol
        const RealEstate = await ethers.getContractFactory('RealEstate') // grabs compiled NFT contract in hardhat (put contract name here)
        realEstate = await RealEstate.deploy()

        // Mint NFT
        let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/1.json"); // pass image metadata to seller mint
        await transaction.wait() 

        // Deploy Escrow.sol
        const Escrow = await ethers.getContractFactory('Escrow')  // grabs compiled escrow contract in hardhat (put contract name here)
        escrow = await Escrow.deploy( // pass in signers to deployment
            realEstate.address,
            seller.address,
            inspector.address,
            lender.address
        )

        // Approve sale into escrow
        transaction = await realEstate.connect(seller).approve(escrow.address, 1)
        await transaction.wait()

        // Put property into escrow
        transaction = await escrow.connect(seller).property_listing(1, tokens(10), tokens(1), buyer.address)
        await transaction.wait()

    }) 

    describe('Contract_Deployment', () => {     // test deployment

        it('Returns NFT address', async () => { // Test NFT address assignment in Escrow contract

            const result = await escrow.nftAddress()
            expect(result).to.be.equal(realEstate.address) // test from chai

        })

        it('Returns seller', async () => { // Test seller address assignment in Escrow contract
        
            const result = await escrow.seller()
            expect(result).to.be.equal(seller.address) // test from chai

        })

        it('Returns inspector', async () => {  // Test inspector address assignment in Escrow contract
        
            const result = await escrow.inspector()
            expect(result).to.be.equal(inspector.address) // test from chai
        })

        it('Returns lender', async () => {  // Test lender address assignment in Escrow contract

            const result = await escrow.lender()
            expect(result).to.be.equal(lender.address) // test from chai

        })
    })

    describe('Property_Listing', () => {     // test property into escrow function

        it('Updates ownership', async () => {
            // Transfer NFT from seller to this contract
            expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address)
        })

        it('Updates listing status', async () => {
            const result = await escrow.isListed(1)
            expect(result).to.be.equal(true)
        })

        it('Returns purchase price', async () => {
            const result = await escrow.purchasePrice(1)
            expect(result).to.be.equal(tokens(10))
        })

        it('Returns escrow amount', async () => {
            const result = await escrow.escrowAmount(1)
            expect(result).to.be.equal(tokens(1))
        })

        it('Returns buyer', async () => {
            const result = await escrow.buyer(1)
            expect(result).to.be.equal(buyer.address)
        })
    })

    describe('Down_Payment', () => {

        it('Updates contract balance', async () => {
            // Fund down payment
            const transaction = await escrow.connect(buyer).depositDownPayment(1, {value: tokens(1)})
            await transaction.wait()

            // test result
            const result = await escrow.getBalance()
            expect(result).to.be.equal(tokens(1))
        })
    })

    describe('Inspection', () => {

        it('Updates inspection certification', async () => {
            // Inspect
            const transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
            await transaction.wait()

            // test result
            const result = await escrow.inspectionPassed(1)
            expect(result).to.be.equal(true)
        })
    })

    describe('Approval', () => {

        it('Updates approval status', async () => {
            // Approve buyer
            let transaction = await escrow.connect(buyer).approveSale(1)
            await transaction.wait()
            
            // Approve seller
            transaction = await escrow.connect(seller).approveSale(1)
            await transaction.wait()

            // Approve lender
            transaction = await escrow.connect(lender).approveSale(1)
            await transaction.wait()

            // test results
            expect(await escrow.approved(1, buyer.address)).to.be.equal(true)
            expect(await escrow.approved(1, seller.address)).to.be.equal(true)
            expect(await escrow.approved(1, lender.address)).to.be.equal(true)
        })
    })

    describe('Sale', () => {
        beforeEach(async () => {

            // Ensure down payment
            let transaction = await escrow.connect(buyer).depositDownPayment(1, {value: tokens(1)})
            await transaction.wait()

            // Clear inspection
            transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
            await transaction.wait()

            // Approve buyer
            transaction = await escrow.connect(buyer).approveSale(1)
            await transaction.wait()
            
            // Approve seller
            transaction = await escrow.connect(seller).approveSale(1)
            await transaction.wait()

            // Approve lender
            transaction = await escrow.connect(lender).approveSale(1)
            await transaction.wait()

            // Fund from lender
            await lender.sendTransaction({ to: escrow.address, value: tokens(9) })

            // Final seller signature
            transaction = await escrow.connect(seller).finalizeSale(1)
            await transaction.wait()

        })

        it('Pays seller', async () => {
            // Check escrow final balance
            expect(await escrow.getBalance()).to.be.equal(0)
        })

        it('Transfers Final Ownership', async () => {
            // Check final ownership
            expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address)
        })
    })
})