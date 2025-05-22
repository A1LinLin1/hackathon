module audit::ReportStore {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;

    public struct AuditReport has key, store {
        id: UID,
        owner: address,
        timestamp: u64,          // 新增：客户端传来的时间戳（秒）
        file_name: vector<u8>,    // 新增：文件名 bytes
        code_hash: vector<u8>,
        result_summary: vector<u8>,
    }
    fun new_report(
        timestamp: u64,
        file_name: vector<u8>,
        code_hash: vector<u8>,
        result_summary: vector<u8>,
        ctx: &mut TxContext
    ): AuditReport {
        AuditReport {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            timestamp,
            file_name,
            code_hash,
            result_summary
        }
    }
    public entry fun submit(
        timestamp: u64,
        file_name: vector<u8>,
        code_hash: vector<u8>,
        result_summary: vector<u8>,
        ctx: &mut TxContext
    ) {
        let report = new_report(timestamp, file_name, code_hash, result_summary, ctx);
        transfer::public_transfer(report, tx_context::sender(ctx));
    }
}

