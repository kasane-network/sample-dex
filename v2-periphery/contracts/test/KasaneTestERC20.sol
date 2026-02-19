pragma solidity =0.6.6;

import '../libraries/SafeMath.sol';

// where/what/why:
// - where: v2-periphery test contracts
// - what: minimal ERC20 for Kasane testnet bring-up with configurable metadata
// - why: deploy distinct test tokens (e.g. testETH / testUSDC) without extra dependencies
contract KasaneTestERC20 {
    using SafeMath for uint256;

    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply,
        address _recipient
    ) public {
        require(bytes(_name).length > 0, 'KASANE_ERC20: EMPTY_NAME');
        require(bytes(_symbol).length > 0, 'KASANE_ERC20: EMPTY_SYMBOL');
        require(_recipient != address(0), 'KASANE_ERC20: ZERO_RECIPIENT');
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        _mint(_recipient, _totalSupply);
    }

    function _mint(address to, uint256 value) internal {
        totalSupply = totalSupply.add(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(address(0), to, value);
    }

    function _approve(address owner, address spender, uint256 value) private {
        allowance[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    function _transfer(address from, address to, uint256 value) private {
        require(to != address(0), 'KASANE_ERC20: ZERO_TO');
        balanceOf[from] = balanceOf[from].sub(value);
        balanceOf[to] = balanceOf[to].add(value);
        emit Transfer(from, to, value);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance != uint256(-1)) {
            allowance[from][msg.sender] = currentAllowance.sub(value);
        }
        _transfer(from, to, value);
        return true;
    }
}
