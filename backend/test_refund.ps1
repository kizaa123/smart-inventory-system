$ErrorActionPreference = "Stop"

$product = Invoke-RestMethod -Uri "http://localhost:5000/api/products" | Select-Object -First 1
$productId = $product.id
$price = $product.sell_price

Write-Host "Creating sale for Product ID $productId with Price $price"

$saleData = @{
    staff_id = 1
    items = @( @{ product_id = $productId; quantity = 2; price = $price } )
} | ConvertTo-Json -Depth 3

$saleRes = Invoke-RestMethod -Uri "http://localhost:5000/api/sales" -Method Post -ContentType "application/json" -Body $saleData
$orderId = $saleRes.order_id
Write-Host "Created Order $orderId"

$stats1 = Invoke-RestMethod -Uri "http://localhost:5000/api/dashboard/stats"
Write-Host "Sales After Purchase: $($stats1.todaysSales)"

$returnData = @{
    original_order_id = $orderId
    staff_id = 1
    items = @( @{ product_id = $productId; return_quantity = 1; unit_price = $price } )
} | ConvertTo-Json -Depth 3

Write-Host "Processing Return..."
$returnRes = Invoke-RestMethod -Uri "http://localhost:5000/api/returns" -Method Post -ContentType "application/json" -Body $returnData
Write-Host "Return Order ID: $($returnRes.return_order_id)"

$stats2 = Invoke-RestMethod -Uri "http://localhost:5000/api/dashboard/stats"
Write-Host "Sales After Return (Should be lower): $($stats2.todaysSales)"

Write-Host "Hourly Today after return:"
$stats2.hourlyToday | ConvertTo-Json
