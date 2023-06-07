// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

// Import audited NFT smartcontract
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract RealEstate is ERC721URIStorage{ // File contract name
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("Real Estate NFTs", "REAL") {} // creates new ERC721 object (Name , TICKER)

    function mint(string memory tokenURI) public returns (uint256) {
        _tokenIds.increment(); // increment number of NFTs

        uint256 newItemId = _tokenIds.current(); // assign Id
        _mint(msg.sender, newItemId); // internal minting function
        _setTokenURI(newItemId, tokenURI); // internal metadata assignment

        return newItemId;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();  //update total supply
    }

}
