import sum from "./summer.js";

function average(sum, nums) {
	return sum(nums) / nums.length;
}


module.exports = average;