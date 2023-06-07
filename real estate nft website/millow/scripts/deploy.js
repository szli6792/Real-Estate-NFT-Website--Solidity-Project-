// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether') //helper that converts currency to tokens
}

async function main() {

    // Setup accounts
    [buyer, seller, inspector, lender] = await ethers.getSigners() // get 20 different test metamask account addresses from hardhat
    
    // Deploy RealEstate.sol
    const RealEstate = await ethers.getContractFactory('RealEstate') // grabs compiled NFT contract in hardhat (put contract name here)
    const realEstate = await RealEstate.deploy()
    await realEstate.deployed()

    console.log(`Deployed Real Estate Contract at: ${realEstate.address}`)
    console.log(`Minting 3 properties...\n`)

    // Mint properties
    for (let i = 0; i < 3; i++) {
      const transaction = await realEstate.connect(seller).mint(`https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${i + 1}.json`) // pass the metadata for 3 nfts
      await transaction.wait()

      const result = await realEstate.tokenURI(i+1) // Show metadata links (URIs)
      console.log(`${result}\n`);
    }

    // Deploy Escrow.sol
    const Escrow = await ethers.getContractFactory('Escrow')  // grabs compiled escrow contract in hardhat (put contract name here)
    const escrow = await Escrow.deploy( // pass in signers to deployment 
        realEstate.address,
        seller.address,
        inspector.address,
        lender.address
    )
    await escrow.deployed()

    console.log(`Deployed Escrow Contract at: ${escrow.address}`)

    // Approve properties for sale
    for (let i = 0; i < 3; i++) {
      const transaction = await realEstate.connect(seller).approve(escrow.address, i + 1)
      await transaction.wait()
    }

    // Put properties into escrow
    let transaction = await escrow.connect(seller).property_listing(1, tokens(20), tokens(2), buyer.address)
    await transaction.wait()
    transaction = await escrow.connect(seller).property_listing(2, tokens(15), tokens(1.5), buyer.address)
    await transaction.wait()
    transaction = await escrow.connect(seller).property_listing(3, tokens(10), tokens(1), buyer.address)
    await transaction.wait()

    console.log("Finished.")
  }

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});