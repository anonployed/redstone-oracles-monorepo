// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "./NumericArrayLib.sol";

library RedstoneDefaultsLib {
  uint256 constant DEFAULT_MAX_DATA_TIMESTAMP_DELAY_IN_SECONDS = 3 * 60;
  uint256 constant DEFAULT_MAX_DATA_TIMESTAMP_AHEAD_IN_SECONDS = 60;

  function isTimestampValid(uint256 _receivedTimestamp) internal view returns (bool) {
    // Getting data timestamp from future seems quite unlikely
    // But we've already spent too much time with different cases
    // Where block.timestamp was less than dataPackage.timestamp.
    // Some blockchains may case this problem as well.
    // That's why we add MAX_BLOCK_TIMESTAMP_DELAY
    // and allow data "from future" but with a small delay
    require(
      (block.timestamp + DEFAULT_MAX_DATA_TIMESTAMP_AHEAD_IN_SECONDS) >
        _receivedTimestamp,
      "Data with future timestamps is not allowed"
    );

    return
      block.timestamp < _receivedTimestamp ||
      block.timestamp - _receivedTimestamp < DEFAULT_MAX_DATA_TIMESTAMP_DELAY_IN_SECONDS;
  }

  function aggregateValues(uint256[] memory values) internal view returns (uint256) {
    return NumericArrayLib.pickMedian(values);
  }
}
