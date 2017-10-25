#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QtNetwork/QtNetwork>

namespace Ui {
class MainWindow;
}

class MainWindow : public QMainWindow
{
	Q_OBJECT

public:
	explicit MainWindow(QWidget *parent = 0);
	~MainWindow();

private:
	QString Domainatrix;
	void postAutoUi();

private slots:
	void on_actionRefresh_triggered();

	void on_actionQuit_triggered();

	void on_dataTable_doubleClicked(const QModelIndex &index);

	void on_replyFinished(QNetworkReply* reply);

private:
	void *rmodel;
	Ui::MainWindow *ui;
	QNetworkAccessManager *net;
	bool refreshLocked;
};

#endif // MAINWINDOW_H
