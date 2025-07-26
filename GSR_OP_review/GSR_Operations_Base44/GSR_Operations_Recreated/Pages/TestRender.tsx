import React from "react";
import StatsCard from "../Components/dashboard/StatsCard";
import MaterialList from "../Components/material/MaterialList";
import BatchList from "../Components/production/BatchList";
import OrderList from "../Components/orders/OrderList";
import CustomerList from "../Components/customers/CustomerList";
import FinanceMetrics from "../Components/finance/FinanceMetrics";

const TestRender: React.FC = () => {
  return (
    <div style={{ padding: 32 }}>
      <h1>Component Render Test</h1>
      <section>
        <h2>Dashboard: StatsCard</h2>
        <StatsCard />
      </section>
      <section>
        <h2>Material: MaterialList</h2>
        <MaterialList />
      </section>
      <section>
        <h2>Production: BatchList</h2>
        <BatchList />
      </section>
      <section>
        <h2>Orders: OrderList</h2>
        <OrderList />
      </section>
      <section>
        <h2>Customers: CustomerList</h2>
        <CustomerList />
      </section>
      <section>
        <h2>Finance: FinanceMetrics</h2>
        <FinanceMetrics />
      </section>
    </div>
  );
};

export default TestRender; 