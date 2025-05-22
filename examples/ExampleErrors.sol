// examples/ExampleErrors.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ExampleErrors {
    mapping(address => uint) public balances;

    // 漏洞：unchecked low-level call
    function unsafeCall(address target, bytes calldata data) public {
        // 未检查返回值
        target.call(data);
    }

    // 漏洞：整数溢出（在 0.8.0 之前会溢出，这里用 unchecked 模拟）
    function overflowExample(uint x) public pure returns (uint) {
        unchecked {
            return x + type(uint).max;
        }
    }

    // 漏洞：重入（先转账再更新余额）
    function withdraw(uint amount) public {
        require(balances[msg.sender] >= amount, "Insufficient");
        // 先调用外部，再更新状态
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] -= amount;
    }

    // 漏洞：未初始化变量（示例“逻辑缺陷”）
    function logicDefect(uint x) public pure returns (uint) {
        uint y;
        if (x > 10) {
            y = x * 2;
        }
        // 当 x <= 10 时 y 未被赋值
        return y;
    }
}

