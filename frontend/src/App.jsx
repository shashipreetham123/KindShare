import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Browse from './pages/Browse';
import Inventory from './pages/User/Inventory';
import MyProduct from './pages/User/MyProduct';
import Product from './pages/User/Product';
import Request from './pages/User/Request';
import Reserve from './pages/User/Reserve';
import History from './pages/User/History';
import AddProduct from './pages/User/AddProduct';
import './App.css';

// Reusable inline placeholder view for dashboard routes without creating external files
function PageView({ title }) {
  return (
    <div className="outlet-page-placeholder">
      <h1>{title}</h1>
      <p>Content for {title} will appear here.</p>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Dashboard with nested child routes rendered inside its Outlet */}
      <Route path="/dashboard" element={<Dashboard />}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<Home />} />
        <Route path="browse" element={<Browse />} />
        <Route path="add-product" element={<AddProduct />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="myproduct/:productId" element={<MyProduct />} />
        <Route path="my-product/:productId" element={<MyProduct />} />
        <Route path="product/:productId" element={<Product />} />
        <Route path="requests" element={<Request />} />
        <Route path="reserves" element={<Reserve />} />
        <Route path="users" element={<PageView title="Users" />} />
        <Route path="history" element={<History />} />
        <Route path="account-settings" element={<PageView title="Account Settings" />} />
      </Route>
    </Routes>
  );
}

export default App;
