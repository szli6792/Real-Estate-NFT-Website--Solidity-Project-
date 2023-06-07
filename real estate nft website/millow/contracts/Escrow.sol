//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 { // allows interaction between nft smart contracts
    function transferFrom(
        address _from,
        address _to,
        uint256 _id
    ) external;
}

contract Escrow {
    
    // store addresses
    address public nftAddress; // variable is visible outside smart contract
    address payable public seller; // variable is visible outside smart contract, contract can release money to seller
    address public inspector; // variable is visible outside smart contract
    address public lender; // variable is visible outside smart contract 

    // put permissions on buyer address
    modifier onlyBuyer(uint256 _nftID) {
        require(msg.sender == buyer[_nftID], "Only buyer can call this method");
        _;
    }

    // put permissions on seller address
    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this method");
        _;
    }

    // put permissions on inspector address
    modifier onlyInspector() {
        require(msg.sender == inspector, "Only inspector can call this method");
        _;
    }

    // mappings keep track of each nftID (there can be multiple nfts in each nft smart contract)
    mapping(uint256 => bool) public isListed; // stores/checks if nft is listed

    // Store purchase price, escrow amount, and buyer id
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public buyer;

    // Store/check if inspected
    mapping(uint256 => bool) public inspectionPassed; // false by default

    // Store/check if approved
    mapping(uint256 => mapping(address => bool)) public approved; // mapping that passes an address of approver

    constructor( // init addresses from input - called when deployed
        address _nftAddress, 
        address payable _seller, 
        address _inspector, 
        address _lender
    ) {
        nftAddress = _nftAddress;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
    }

//--------------FUNCTIONS---------------------------------------------------------

    function property_listing( // put property nft ownership into escrow
        uint256 _nftID,
        uint256 _purchasePrice,
        uint256 _escrowAmount,
        address _buyer
    ) public payable onlySeller { // authorize only seller to make the listing
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftID); // interfaces with RealEstate.sol to transfer ownership of nft from seller to escrow address

        isListed[_nftID] = true; // mark NFT as listed
        purchasePrice[_nftID] = _purchasePrice; // store price
        escrowAmount[_nftID] = _escrowAmount; // store down payment
        buyer[_nftID] = _buyer; // store buyer
    }


    function depositDownPayment( // make down payment
        uint256 _nftID
    ) public payable onlyBuyer(_nftID) { // authorize only buyer to make a down payment
        require(msg.value >= escrowAmount[_nftID]); // make sure the value of the payment is sufficient


    }


    receive() external payable {} // allow contract to receive money
    function getBalance() public view returns (uint256) { // check balance
        return address(this).balance;
    }


    function updateInspectionStatus( // certify inspection
        uint256 _nftID,
        bool _passed
    ) public onlyInspector { // authorize only inspector to certify
        inspectionPassed[_nftID] = _passed;
    }


    function approveSale(uint256 _nftID) public { // approve sale
        approved[_nftID][msg.sender] = true;
    }


    // require inspection, authorization, correct funds, nft transfer to buyer, funds trasnfer to seller
    function finalizeSale(uint256 _nftID) public {
        require(inspectionPassed[_nftID]); // require inspection

        // require authorizations
        require(approved[_nftID][buyer[_nftID]]); 
        require(approved[_nftID][seller]);
        require(approved[_nftID][lender]);

        // check funding
        require(address(this).balance >= purchasePrice[_nftID]);

        // release funds
        (bool success, ) = payable(seller).call{value: purchasePrice[_nftID]}(""); // if you use value: address(this).balance, it empties the whole escrow for all nftIds
        require(success);

        // transfer nft ownership
        IERC721(nftAddress).transferFrom(address(this), buyer[_nftID], _nftID); // interfaces with RealEstate.sol to transfer ownership of nft from escrow to buyer address

        // update listing status
        isListed[_nftID] = false;
    }


    // cancel sale (if inspection is not approved, then refund all assets)
    function cancelSale(uint256 _nftID) public {
        if (inspectionPassed[_nftID] == false) {
            payable(buyer[_nftID]).transfer(address(this).balance); // if inspection failed, return down payment
        } else {
            payable(seller).transfer(address(this).balance); // if inspection passed, keep down payment
        }
    }
}
